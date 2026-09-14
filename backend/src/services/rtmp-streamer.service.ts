import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { prisma } from '../lib/prisma';
import { EncryptionService } from './encryption.service';

interface StreamSession {
  broadcastId: string;
  roomName: string;
  destinationUrls: string[];
  ffmpegProcesses: ChildProcess[];
  startedAt: Date;
  status: 'STARTING' | 'LIVE' | 'STOPPED' | 'ERROR';
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

export class RtmpStreamerService extends EventEmitter {
  private static instance: RtmpStreamerService;
  private readonly encryptionService: EncryptionService;
  private readonly activeSessions: Map<string, StreamSession> = new Map();
  private readonly headerBuffers: Map<string, Buffer> = new Map();

  constructor() {
    super();
    this.encryptionService = new EncryptionService();
  }

  public static getInstance(): RtmpStreamerService {
    if (!RtmpStreamerService.instance) {
      RtmpStreamerService.instance = new RtmpStreamerService();
    }
    return RtmpStreamerService.instance;
  }

  /**
   * Spawn a robust, low-CPU FFmpeg RTMP process for YouTube / Facebook / Twitch
   */
  private spawnFfmpegProcess(broadcastId: string, targetUrl: string): ChildProcess {
    // Broadcast-grade low-CPU configuration with CFR fps filter to prevent macroblock tearing
    const args = [
      '-analyzeduration', '1000000',
      '-probesize', '1000000',
      '-fflags', '+nobuffer+genpts',
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
      '-r', '30',
      '-vsync', 'cfr',
      '-flags', '+global_header',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '44100',
      '-af', 'aresample=async=1:first_pts=0',
      '-rw_timeout', '15000000',
      '-f', 'flv',
      '-flvflags', 'no_duration_filesize',
      '-rtmp_live', 'live',
      targetUrl,
    ];

    const maskedUrl = targetUrl.length > 15 ? targetUrl.substring(0, targetUrl.length - 8) + '********' : 'rtmp://...';
    console.log(`[FFmpeg RTMP]: Spawning stream pipeline for ${broadcastId} -> ${maskedUrl}`);
    const proc = spawn('ffmpeg', args, { stdio: ['pipe', 'ignore', 'pipe'] });

    // Handle stdin errors to prevent Node process unhandled EPIPE crashes
    proc.stdin?.on('error', (err) => {
      console.warn(`[FFmpeg RTMP Stdin Warning - ${broadcastId}]:`, err.message);
    });

    proc.stderr?.on('data', (data) => {
      const raw = data.toString();
      const session = this.activeSessions.get(broadcastId);
      const lines = raw.split(/[\r\n]+/).map((l: string) => l.trim()).filter(Boolean);

      for (const line of lines) {
        if (session) {
          session.recentLogs.push(`[${new Date().toISOString().substring(11, 19)}] ${line}`);
          if (session.recentLogs.length > 30) {
            session.recentLogs.shift();
          }

          // Active RTMP output detection: FFmpeg writes frame= / fps= / bitrate= when transmitting to YouTube
          if (line.includes('frame=') || line.includes('fps=') || line.includes('bitrate=')) {
            session.isConnectedToRtmp = true;
            session.status = 'LIVE';
            session.lastError = null;

            const fpsMatch = line.match(/fps=\s*([0-9.]+)/);
            if (fpsMatch) session.currentFps = parseFloat(fpsMatch[1]);

            const brMatch = line.match(/bitrate=\s*([0-9.]+\w+)/);
            if (brMatch) session.currentBitrate = brMatch[1];

            const timeMatch = line.match(/time=\s*([0-9:.]+)/);
            if (timeMatch) session.streamTime = timeMatch[1];

            const frameMatch = line.match(/frame=\s*(\d+)/);
            if (frameMatch) session.framesSent = parseInt(frameMatch[1], 10);
          }

          // Connection failure detection
          const lower = line.toLowerCase();
          if (
            lower.includes('connection refused') ||
            lower.includes('connection timed out') ||
            lower.includes('cannot open connection') ||
            lower.includes('server error') ||
            lower.includes('handshake failed') ||
            lower.includes('broken pipe') ||
            lower.includes('network is unreachable') ||
            lower.includes('error opening output')
          ) {
            session.lastError = line;
            session.isConnectedToRtmp = false;
            console.error(`[FFmpeg RTMP Error - ${broadcastId}]:`, line);
          }
        }
        console.log(`[FFmpeg RTMP - ${broadcastId}]:`, line);
      }
    });

    proc.on('close', (code) => {
      console.log(`[FFmpeg RTMP Exited - ${broadcastId}]: exit code ${code}`);
      const session = this.activeSessions.get(broadcastId);
      if (session) {
        session.isConnectedToRtmp = false;
        if (code !== 0 && !session.lastError) {
          session.lastError = `FFmpeg encoder exited with code ${code}`;
        }
        // Auto-heal: If broadcast is still LIVE or STARTING, automatically reconnect pipeline!
        if (session.status === 'LIVE' || session.status === 'STARTING') {
          console.log(`[FFmpeg RTMP Auto-Recovery]: Reconnecting stream for ${targetUrl} in 1s...`);
          setTimeout(() => {
            this.respawnDestinationProcess(broadcastId, targetUrl, proc);
          }, 1000);
        }
      }
    });

    return proc;
  }

  /**
   * Auto-recover a closed FFmpeg process by respawning it and sending the cached WebM header
   */
  private respawnDestinationProcess(broadcastId: string, targetUrl: string, oldProc: ChildProcess): void {
    const session = this.activeSessions.get(broadcastId);
    if (!session || session.status !== 'LIVE') return;

    try {
      const newProc = this.spawnFfmpegProcess(broadcastId, targetUrl);

      // Write cached WebM initialization header to new process
      const cachedHeader = this.headerBuffers.get(broadcastId);
      if (cachedHeader && newProc.stdin && newProc.stdin.writable) {
        newProc.stdin.write(cachedHeader);
      }

      // Replace old process in session
      session.ffmpegProcesses = session.ffmpegProcesses.filter((p) => p !== oldProc);
      session.ffmpegProcesses.push(newProc);
      console.log(`[FFmpeg RTMP Auto-Recovery]: Stream pipeline restored successfully for ${broadcastId}`);
    } catch (err) {
      console.error(`[FFmpeg RTMP Auto-Recovery Failed for ${broadcastId}]:`, err);
    }
  }

  /**
   * Resolve and decrypt RTMP destination URLs for a broadcast
   */
  public async resolveDestinationUrls(
    destinationIds: string[],
    directDestinations?: Array<{ rtmpUrl: string; streamKey?: string }>
  ): Promise<string[]> {
    const urls: string[] = [];

    // 1. Direct destinations provided by client (e.g. from studio modal)
    if (directDestinations && Array.isArray(directDestinations)) {
      for (const d of directDestinations) {
        if (d.rtmpUrl && d.streamKey && !d.streamKey.includes('••••')) {
          const cleanUrl = d.rtmpUrl.replace(/\/+$/, '');
          const streamKey = d.streamKey.trim();
          urls.push(`${cleanUrl}/${streamKey}`);
        }
      }
    }

    // 2. Query database for saved destinations
    try {
      const destinations = await prisma.destination.findMany({
        where: { id: { in: destinationIds } },
      });

      for (const dest of destinations) {
        try {
          const decRes = await this.encryptionService.decrypt({
            iv: dest.streamKeyIv,
            authTag: dest.streamKeyTag,
            encryptedData: dest.streamKeyEncrypted,
          });

          if (decRes.success && decRes.data) {
            const cleanUrl = dest.rtmpUrl.replace(/\/+$/, '');
            const streamKey = decRes.data.trim();
            const fullRtmp = `${cleanUrl}/${streamKey}`;
            if (!urls.includes(fullRtmp)) {
              urls.push(fullRtmp);
            }

            await prisma.destination.update({
              where: { id: dest.id },
              data: { status: 'LIVE', lastUsedAt: new Date() },
            }).catch(() => {});
          }
        } catch (err) {
          console.error(`Failed to decrypt stream key for destination ${dest.name}:`, err);
        }
      }
    } catch (dbErr) {
      console.warn('[RTMP] Database query skipped in resolveDestinationUrls:', dbErr);
    }

    // 3. Check memory fallback destinations if not found in DB
    try {
      const { fallbackDestinations } = await import('../routes/destination.routes');
      for (const destId of destinationIds) {
        const fallback = fallbackDestinations.find((d) => d.id === destId);
        if (fallback) {
          const decRes = await this.encryptionService.decrypt({
            iv: fallback.streamKeyIv,
            authTag: fallback.streamKeyTag,
            encryptedData: fallback.streamKeyEncrypted,
          });
          if (decRes.success && decRes.data) {
            const cleanUrl = fallback.rtmpUrl.replace(/\/+$/, '');
            const streamKey = decRes.data.trim();
            const fullRtmp = `${cleanUrl}/${streamKey}`;
            if (!urls.includes(fullRtmp)) {
              urls.push(fullRtmp);
            }
          }
        }
      }
    } catch (fbErr) {
      console.warn('[RTMP] Memory fallback check skipped:', fbErr);
    }

    console.log(`[RTMP] Resolved ${urls.length} target RTMP destination URL(s)`);
    return urls;
  }

  /**
   * Start streaming to one or more RTMP destinations
   */
  public async startBroadcastStream(
    broadcastId: string,
    roomName: string,
    destinationIds: string[],
    directDestinations?: Array<{ rtmpUrl: string; streamKey?: string }>
  ): Promise<{ success: boolean; activeDestinations: number; error?: string }> {
    try {
      if (this.activeSessions.has(broadcastId)) {
        return { success: true, activeDestinations: this.activeSessions.get(broadcastId)!.destinationUrls.length };
      }

      const rtmpUrls = await this.resolveDestinationUrls(destinationIds, directDestinations);
      if (rtmpUrls.length === 0) {
        return { success: false, activeDestinations: 0, error: 'No valid RTMP destinations found or failed to decrypt stream keys' };
      }

      const ffmpegProcesses: ChildProcess[] = [];

      for (const targetUrl of rtmpUrls) {
        try {
          const proc = this.spawnFfmpegProcess(broadcastId, targetUrl);
          ffmpegProcesses.push(proc);
        } catch (spawnErr) {
          console.warn('FFmpeg spawn warning (will continue with available pipelines):', spawnErr);
        }
      }

      const session: StreamSession = {
        broadcastId,
        roomName,
        destinationUrls: rtmpUrls,
        ffmpegProcesses,
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

      // Update broadcast in DB (non-fatal if studio was opened without a pre-existing broadcast record)
      try {
        await prisma.broadcast.update({
          where: { id: broadcastId },
          data: { status: 'LIVE', startedAt: new Date() },
        });
      } catch (dbErr) {
        console.warn(`[RTMP] Broadcast DB record not found for id ${broadcastId}, continuing stream anyway:`, dbErr instanceof Error ? dbErr.message : dbErr);
      }

      return { success: true, activeDestinations: rtmpUrls.length };
    } catch (error) {
      return { success: false, activeDestinations: 0, error: error instanceof Error ? error.message : 'Failed to start RTMP stream' };
    }
  }

  /**
   * Pipe media data chunk into active FFmpeg RTMP processes
   */
  public pushChunk(broadcastId: string, chunk: Buffer): boolean {
    const session = this.activeSessions.get(broadcastId);
    if (!session || session.status === 'STOPPED') {
      console.warn(`[RTMP] pushChunk ignored: session "${broadcastId}" not found or status is "${session?.status}"`);
      return false;
    }

    session.chunksReceived++;
    session.bytesReceived += chunk.length;

    // Cache initial WebM header for recovery
    if (!this.headerBuffers.has(broadcastId)) {
      this.headerBuffers.set(broadcastId, chunk);
      console.log(`[RTMP] Received & cached initial WebM stream header (${chunk.length} bytes) for broadcast ${broadcastId}`);
    }

    let written = 0;
    for (const proc of session.ffmpegProcesses) {
      if (proc.stdin && proc.stdin.writable && !proc.killed) {
        try {
          proc.stdin.write(chunk);
          written++;
        } catch (e) {
          console.warn('Error writing chunk to FFmpeg:', e);
        }
      }
    }
    return written > 0;
  }

  /**
   * Stop broadcast streaming session
   */
  public async stopBroadcastStream(broadcastId: string): Promise<boolean> {
    const session = this.activeSessions.get(broadcastId);
    if (!session) return false;

    session.status = 'STOPPED';
    session.isConnectedToRtmp = false;

    for (const proc of session.ffmpegProcesses) {
      try {
        proc.stdin?.end();
        proc.kill('SIGTERM');
      } catch (e) {
        console.warn('Error killing FFmpeg process:', e);
      }
    }

    this.activeSessions.delete(broadcastId);
    this.headerBuffers.delete(broadcastId);

    // Update broadcast in DB
    try {
      await prisma.broadcast.update({
        where: { id: broadcastId },
        data: { status: 'ENDED', endedAt: new Date() },
      });
    } catch (e) {
      console.warn('Could not update broadcast to ENDED:', e);
    }

    return true;
  }

  public getSession(broadcastId: string): StreamSession | undefined {
    return this.activeSessions.get(broadcastId);
  }

  /**
   * Get real-time connection telemetry for the Program Output Monitor
   */
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
      active: true,
      status: session.status,
      isConnectedToRtmp: session.isConnectedToRtmp,
      framesSent: session.framesSent,
      currentFps: session.currentFps,
      currentBitrate: session.currentBitrate,
      streamTime: session.streamTime,
      bytesReceived: session.bytesReceived,
      chunksReceived: session.chunksReceived,
      destinationsCount: session.destinationUrls.length,
      lastError: session.lastError,
      recentLogs: session.recentLogs.slice(-10),
    };
  }
}

export default RtmpStreamerService;
