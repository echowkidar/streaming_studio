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
   * Resolve and decrypt RTMP destination URLs for a broadcast
   */
  public async resolveDestinationUrls(destinationIds: string[]): Promise<string[]> {
    const destinations = await prisma.destination.findMany({
      where: { id: { in: destinationIds } },
    });

    const urls: string[] = [];

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
          // Standard RTMP format: rtmp://a.rtmp.youtube.com/live2/key
          const fullRtmp = `${cleanUrl}/${streamKey}`;
          urls.push(fullRtmp);

          // Update destination status and last used
          await prisma.destination.update({
            where: { id: dest.id },
            data: { status: 'LIVE', lastUsedAt: new Date() },
          });
        }
      } catch (err) {
        console.error(`Failed to decrypt stream key for destination ${dest.name}:`, err);
      }
    }

    return urls;
  }

  /**
   * Start streaming to one or more RTMP destinations
   */
  public async startBroadcastStream(
    broadcastId: string,
    roomName: string,
    destinationIds: string[]
  ): Promise<{ success: boolean; activeDestinations: number; error?: string }> {
    try {
      if (this.activeSessions.has(broadcastId)) {
        return { success: true, activeDestinations: this.activeSessions.get(broadcastId)!.destinationUrls.length };
      }

      const rtmpUrls = await this.resolveDestinationUrls(destinationIds);
      if (rtmpUrls.length === 0) {
        return { success: false, activeDestinations: 0, error: 'No valid RTMP destinations found or failed to decrypt stream keys' };
      }

      const ffmpegProcesses: ChildProcess[] = [];

      for (const targetUrl of rtmpUrls) {
        // High quality broadcast configuration matching YouTube Live specs (720p/1080p, H.264, AAC, 60fps/30fps, 4500k bitrate)
        const args = [
          '-re',
          '-f', 'webm',
          '-i', 'pipe:0',
          '-c:v', 'libx264',
          '-preset', 'veryfast',
          '-tune', 'zerolatency',
          '-b:v', '4000k',
          '-maxrate', '4500k',
          '-bufsize', '9000k',
          '-pix_fmt', 'yuv420p',
          '-g', '60',
          '-r', '30',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-ar', '44100',
          '-f', 'flv',
          targetUrl,
        ];

        try {
          const proc = spawn('ffmpeg', args, { stdio: ['pipe', 'ignore', 'pipe'] });
          proc.stderr?.on('data', (data) => {
            const msg = data.toString();
            if (msg.includes('error') || msg.includes('Error')) {
              console.error(`[FFmpeg RTMP Error - ${broadcastId}]:`, msg);
            }
          });

          proc.on('close', (code) => {
            console.log(`[FFmpeg RTMP Exited - ${broadcastId}]: code ${code}`);
          });

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

      // Update broadcast in DB
      await prisma.broadcast.update({
        where: { id: broadcastId },
        data: { status: 'LIVE', startedAt: new Date() },
      });

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
    if (!session || session.status !== 'LIVE') return false;

    for (const proc of session.ffmpegProcesses) {
      if (proc.stdin && proc.stdin.writable) {
        try {
          proc.stdin.write(chunk);
        } catch (e) {
          console.warn('Error writing chunk to FFmpeg:', e);
        }
      }
    }
    return true;
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
