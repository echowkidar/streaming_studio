import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { prisma } from '../lib/prisma';
import { EncryptionService } from './encryption.service';

/**
 * Live RTMP pipeline:
 *   browser canvas -> MediaRecorder (WebM, 500ms chunks) -> POST /stream/chunk -> ONE ffmpeg -> tee -> N RTMP targets
 *
 * Every MediaRecorder run is an "epoch". Chunk 0 of an epoch carries the WebM header, so a new
 * ffmpeg can only be started at the beginning of an epoch. When ffmpeg dies (network blip, YouTube
 * hiccup) we do NOT feed it mid-stream data again — we answer the next chunk with `restart: true`
 * and the browser starts a fresh MediaRecorder (new epoch, new header). Restarts are rate-limited.
 */

type SessionStatus = 'STARTING' | 'LIVE' | 'RECOVERING' | 'STOPPED' | 'ERROR';

interface StreamSession {
  broadcastId: string;
  roomName: string;
  destinationUrls: string[];
  ffmpeg: ChildProcess | null;
  epoch: number;
  needsRestart: boolean;
  restartTimes: number[];
  startedAt: Date;
  status: SessionStatus;
  isConnectedToRtmp: boolean;
  framesSent: number;
  currentFps: number;
  currentBitrate: string;
  streamTime: string;
  bytesReceived: number;
  chunksReceived: number;
  lastError: string | null;
  recentLogs: string[];
}

export interface PushResult {
  ok: boolean;
  restart?: boolean;
  sessionLost?: boolean;
  fatal?: string;
}

const MAX_RESTARTS = 8;
const RESTART_WINDOW_MS = 5 * 60 * 1000;
const MAX_STDIN_BACKLOG = 48 * 1024 * 1024; // ~2 minutes of video queued in ffmpeg = output is stuck

/** Hide stream keys: rtmp://host/app/KEY -> rtmp://host/app/****KEY-TAIL */
export function redactRtmp(text: string): string {
  return text.replace(/(rtmps?:\/\/[^\s'"|\]]*\/)([^\s/'"|\]]+)/gi, (_m, prefix: string, key: string) => {
    const tail = key.length > 4 ? key.slice(-4) : '';
    return `${prefix}****${tail}`;
  });
}

/** ffmpeg output args for one or many RTMP targets (one encode, fan-out with the tee muxer). */
export function rtmpOutputArgs(urls: string[]): string[] {
  if (urls.length === 1) {
    return ['-map', '0:v:0', '-map', '0:a:0?', '-f', 'flv', '-flvflags', 'no_duration_filesize', urls[0]];
  }
  const escape = (u: string) => u.replace(/([\\|[\]])/g, '\\$1');
  const tee = urls.map((u) => `[f=flv:flvflags=no_duration_filesize:onfail=ignore]${escape(u)}`).join('|');
  return ['-map', '0:v:0', '-map', '0:a:0?', '-f', 'tee', tee];
}

export class RtmpStreamerService extends EventEmitter {
  private static instance: RtmpStreamerService;
  private readonly encryptionService = new EncryptionService();
  private readonly activeSessions: Map<string, StreamSession> = new Map();

  public static getInstance(): RtmpStreamerService {
    if (!RtmpStreamerService.instance) {
      RtmpStreamerService.instance = new RtmpStreamerService();
    }
    return RtmpStreamerService.instance;
  }

  private log(session: StreamSession, line: string) {
    const clean = redactRtmp(line);
    session.recentLogs.push(`[${new Date().toISOString().substring(11, 19)}] ${clean}`);
    if (session.recentLogs.length > 30) session.recentLogs.shift();
  }

  private spawnFfmpeg(session: StreamSession): ChildProcess {
    const args = [
      '-hide_banner',
      '-loglevel', 'info',
      '-analyzeduration', '1000000',
      '-probesize', '1000000',
      '-fflags', '+genpts',
      '-f', 'webm',
      '-i', 'pipe:0',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-tune', 'zerolatency',
      '-b:v', '3000k',
      '-maxrate', '3500k',
      '-bufsize', '6000k',
      '-pix_fmt', 'yuv420p',
      '-g', '60',
      '-keyint_min', '60',
      '-r', '30',
      '-fps_mode', 'cfr',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '44100',
      '-af', 'aresample=async=1:first_pts=0',
      '-rw_timeout', '15000000',
      ...rtmpOutputArgs(session.destinationUrls),
    ];

    console.log(`[FFmpeg RTMP] Starting encoder for ${session.broadcastId} (epoch ${session.epoch}) -> ${session.destinationUrls.length} destination(s)`);
    const proc = spawn('ffmpeg', args, { stdio: ['pipe', 'ignore', 'pipe'] });

    proc.stdin?.on('error', (err) => {
      console.warn(`[FFmpeg RTMP stdin - ${session.broadcastId}]:`, err.message);
    });

    proc.stderr?.on('data', (data) => {
      const lines = data
        .toString()
        .split(/[\r\n]+/)
        .map((l: string) => l.trim())
        .filter(Boolean);
      for (const line of lines) {
        this.log(session, line);
        if (line.includes('frame=') && line.includes('bitrate=')) {
          session.isConnectedToRtmp = true;
          session.status = 'LIVE';
          session.lastError = null;
          const fps = line.match(/fps=\s*([0-9.]+)/);
          if (fps) session.currentFps = parseFloat(fps[1]);
          const br = line.match(/bitrate=\s*([0-9.]+\w+\/s)/);
          if (br) session.currentBitrate = br[1];
          const t = line.match(/time=\s*([0-9:.]+)/);
          if (t) session.streamTime = t[1];
          const f = line.match(/frame=\s*(\d+)/);
          if (f) session.framesSent = parseInt(f[1], 10);
          continue;
        }
        const lower = line.toLowerCase();
        if (
          lower.includes('connection refused') ||
          lower.includes('connection timed out') ||
          lower.includes('cannot open connection') ||
          lower.includes('server error') ||
          lower.includes('handshake') ||
          lower.includes('broken pipe') ||
          lower.includes('network is unreachable') ||
          lower.includes('error opening output') ||
          lower.includes('invalid data found')
        ) {
          session.lastError = redactRtmp(line);
          session.isConnectedToRtmp = false;
          console.error(`[FFmpeg RTMP - ${session.broadcastId}]:`, redactRtmp(line));
        }
      }
    });

    proc.on('close', (code) => {
      if (session.ffmpeg !== proc) return; // an older process we replaced on purpose
      session.ffmpeg = null;
      session.isConnectedToRtmp = false;
      if (session.status === 'STOPPED' || session.status === 'ERROR') return;
      console.warn(`[FFmpeg RTMP - ${session.broadcastId}] encoder exited (code ${code}); asking browser for a fresh stream header.`);
      if (!session.lastError) session.lastError = `Encoder exited with code ${code}`;
      session.status = 'RECOVERING';
      session.needsRestart = true;
    });

    return proc;
  }

  private killFfmpeg(session: StreamSession) {
    const proc = session.ffmpeg;
    session.ffmpeg = null;
    if (!proc) return;
    try {
      proc.stdin?.end();
    } catch { }
    try {
      proc.kill('SIGTERM');
      setTimeout(() => {
        if (proc.exitCode === null) proc.kill('SIGKILL');
      }, 3000);
    } catch { }
  }

  /** Resolve and decrypt RTMP destination URLs (saved destinations of this workspace + direct ones). */
  public async resolveDestinationUrls(
    destinationIds: string[],
    directDestinations?: Array<{ rtmpUrl: string; streamKey?: string }>,
    workspaceIds?: string[]
  ): Promise<string[]> {
    const urls: string[] = [];
    const push = (rtmpUrl: string, key: string) => {
      const clean = rtmpUrl.trim().replace(/\/+$/, '');
      if (!/^rtmps?:\/\//i.test(clean)) return;
      const full = `${clean}/${key.trim()}`;
      if (!urls.includes(full)) urls.push(full);
    };

    if (Array.isArray(directDestinations)) {
      for (const d of directDestinations) {
        if (d?.rtmpUrl && d.streamKey && !d.streamKey.includes('••••')) push(d.rtmpUrl, d.streamKey);
      }
    }

    if (destinationIds.length > 0) {
      const destinations = await prisma.destination.findMany({
        where: { id: { in: destinationIds }, ...(workspaceIds ? { workspaceId: { in: workspaceIds } } : {}) },
      });
      for (const dest of destinations) {
        const decRes = await this.encryptionService.decrypt({
          iv: dest.streamKeyIv,
          authTag: dest.streamKeyTag,
          encryptedData: dest.streamKeyEncrypted,
        });
        if (decRes.success && decRes.data) {
          push(dest.rtmpUrl, decRes.data);
          await prisma.destination
            .update({ where: { id: dest.id }, data: { status: 'LIVE', lastUsedAt: new Date() } })
            .catch(() => null);
        } else {
          console.error(`[RTMP] Could not decrypt stream key for destination "${dest.name}" (was ENCRYPTION_KEY changed? Re-enter the key.)`);
        }
      }
    }

    console.log(`[RTMP] Resolved ${urls.length} RTMP destination URL(s)`);
    return urls;
  }

  public async startBroadcastStream(
    broadcastId: string,
    roomName: string,
    destinationIds: string[],
    directDestinations?: Array<{ rtmpUrl: string; streamKey?: string }>,
    workspaceIds?: string[]
  ): Promise<{ success: boolean; activeDestinations: number; error?: string }> {
    const existing = this.activeSessions.get(broadcastId);
    if (existing && existing.status !== 'ERROR') {
      return { success: true, activeDestinations: existing.destinationUrls.length };
    }

    const rtmpUrls = await this.resolveDestinationUrls(destinationIds, directDestinations, workspaceIds);
    if (rtmpUrls.length === 0) {
      return { success: false, activeDestinations: 0, error: 'No valid RTMP destinations found or failed to decrypt stream keys' };
    }

    const session: StreamSession = {
      broadcastId,
      roomName,
      destinationUrls: rtmpUrls,
      ffmpeg: null,
      epoch: -1,
      needsRestart: false,
      restartTimes: [],
      startedAt: new Date(),
      status: 'STARTING',
      isConnectedToRtmp: false,
      framesSent: 0,
      currentFps: 0,
      currentBitrate: '0kbits/s',
      streamTime: '00:00:00',
      bytesReceived: 0,
      chunksReceived: 0,
      lastError: null,
      recentLogs: [],
    };
    this.activeSessions.set(broadcastId, session);

    await prisma.broadcast
      .update({ where: { id: broadcastId }, data: { status: 'LIVE', startedAt: new Date(), endedAt: null } })
      .catch((e) => console.warn(`[RTMP] Could not mark broadcast ${broadcastId} LIVE:`, e?.message || e));

    return { success: true, activeDestinations: rtmpUrls.length };
  }

  /**
   * Feed one MediaRecorder chunk. `epoch` identifies the MediaRecorder run and `seq` the chunk
   * index inside it (seq 0 = WebM header).
   */
  public pushChunk(broadcastId: string, chunk: Buffer, epoch: number, seq: number): PushResult {
    const session = this.activeSessions.get(broadcastId);
    if (!session || session.status === 'STOPPED') return { ok: false, sessionLost: true };
    if (session.status === 'ERROR') return { ok: false, fatal: session.lastError || 'Stream stopped after repeated failures' };

    session.chunksReceived++;
    session.bytesReceived += chunk.length;

    if (epoch > session.epoch) {
      if (seq !== 0) {
        // Middle of a recorder run we never saw the header of (e.g. API restarted) — need a new header.
        return { ok: false, restart: true };
      }
      // New recorder run: (re)start the encoder with the fresh header.
      const now = Date.now();
      session.restartTimes = session.restartTimes.filter((t) => now - t < RESTART_WINDOW_MS);
      if (session.epoch >= 0) session.restartTimes.push(now);
      if (session.restartTimes.length > MAX_RESTARTS) {
        session.status = 'ERROR';
        session.lastError = `Stream stopped: encoder failed ${session.restartTimes.length} times in 5 minutes. Last error: ${session.lastError || 'unknown'}`;
        this.killFfmpeg(session);
        void prisma.broadcast
          .update({ where: { id: broadcastId }, data: { status: 'FAILED', endedAt: new Date() } })
          .catch(() => null);
        return { ok: false, fatal: session.lastError };
      }
      this.killFfmpeg(session);
      session.epoch = epoch;
      session.needsRestart = false;
      if (session.status !== 'LIVE') session.status = 'STARTING';
      session.ffmpeg = this.spawnFfmpeg(session);
    } else if (epoch < session.epoch) {
      return { ok: true }; // late chunk from an old recorder run — drop silently
    }

    if (session.needsRestart || !session.ffmpeg) {
      return { ok: false, restart: true };
    }

    const stdin = session.ffmpeg.stdin;
    if (!stdin || !stdin.writable) {
      session.needsRestart = true;
      return { ok: false, restart: true };
    }
    if (stdin.writableLength > MAX_STDIN_BACKLOG) {
      session.lastError = 'Output to RTMP server is stalled (encoder backlog too large) — restarting stream';
      this.log(session, session.lastError);
      this.killFfmpeg(session);
      session.status = 'RECOVERING';
      session.needsRestart = true;
      return { ok: false, restart: true };
    }
    stdin.write(chunk);
    return { ok: true };
  }

  public async stopBroadcastStream(broadcastId: string): Promise<boolean> {
    const session = this.activeSessions.get(broadcastId);
    if (!session) return false;
    session.status = 'STOPPED';
    session.isConnectedToRtmp = false;
    this.killFfmpeg(session);
    this.activeSessions.delete(broadcastId);

    await prisma.broadcast
      .update({ where: { id: broadcastId }, data: { status: 'ENDED', endedAt: new Date() } })
      .catch(() => null);
    return true;
  }

  public getSession(broadcastId: string): StreamSession | undefined {
    return this.activeSessions.get(broadcastId);
  }

  public getStatus(broadcastId: string) {
    const session = this.activeSessions.get(broadcastId);
    if (!session) {
      return {
        active: false,
        status: 'IDLE' as const,
        isConnectedToRtmp: false,
        framesSent: 0,
        currentFps: 0,
        currentBitrate: '0kbits/s',
        streamTime: '00:00:00',
        bytesReceived: 0,
        chunksReceived: 0,
        destinationsCount: 0,
        lastError: null,
        recentLogs: [] as string[],
      };
    }
    return {
      active: session.status !== 'ERROR',
      status: session.status,
      isConnectedToRtmp: session.isConnectedToRtmp,
      framesSent: session.framesSent,
      currentFps: session.currentFps,
      currentBitrate: session.currentBitrate,
      streamTime: session.streamTime,
      startedAt: session.startedAt,
      bytesReceived: session.bytesReceived,
      chunksReceived: session.chunksReceived,
      destinationsCount: session.destinationUrls.length,
      restartsLast5Min: session.restartTimes.length,
      lastError: session.lastError,
      recentLogs: session.recentLogs.slice(-10),
    };
  }
}

export default RtmpStreamerService;
