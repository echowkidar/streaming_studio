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
      '-fflags', '+nobuffer+genpts',
      '-f', 'webm',
      '-i', 'pipe:0',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-tune', 'zerolatency',
      '-b:v', '2500k',
      '-maxrate', '2500k',
      '-bufsize', '5000k',
      '-pix_fmt', 'yuv420p',
      '-g', '60',
      '-vf', 'fps=30',
      '-r', '30',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '44100',
      '-af', 'aresample=async=1:first_pts=0',
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
      const msg = data.toString().trim();
      if (msg) {
        console.log(`[FFmpeg RTMP - ${broadcastId}]:`, msg);
      }
    });

    proc.on('close', (code) => {
      console.log(`[FFmpeg RTMP Exited - ${broadcastId}]: exit code ${code}`);
      const session = this.activeSessions.get(broadcastId);
      // Auto-heal: If broadcast is still LIVE, automatically reconnect pipeline!
      if (session && session.status === 'LIVE') {
        console.log(`[FFmpeg RTMP Auto-Recovery]: Reconnecting stream for ${targetUrl} in 1s...`);
        setTimeout(() => {
          this.respawnDestinationProcess(broadcastId, targetUrl, proc);
        }, 1000);
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
        status: 'LIVE',
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
    if (!session || session.status !== 'LIVE') {
      console.warn(`[RTMP] pushChunk ignored: session "${broadcastId}" not found or status is "${session?.status}"`);
      return false;
    }

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
}

export default RtmpStreamerService;
