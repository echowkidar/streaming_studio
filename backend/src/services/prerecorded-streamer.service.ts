import fs from 'fs';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { prisma } from '../lib/prisma';
import { RtmpStreamerService } from './rtmp-streamer.service';

export interface ScheduleOptions {
  broadcastId: string;
  title: string;
  workspaceId: string;
  videoFilePath: string;
  durationSeconds: number;
  scheduledAt: Date;
  destinationIds: string[];
  directDestinations?: Array<{ name: string; rtmpUrl: string; streamKey: string }>;
}

export class PrerecordedStreamerService extends EventEmitter {
  private static instance: PrerecordedStreamerService;
  private readonly scheduledTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly activeStreams: Map<string, ChildProcess[]> = new Map();
  private readonly storageDir: string;

  private constructor() {
    super();
    this.storageDir = path.join(process.cwd(), 'uploads', 'prerecorded');
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
    // Start 24h failure/orphaned cleanup sweep every 60 minutes
    setInterval(() => this.runGarbageCollectionSweep(), 60 * 60 * 1000);
    this.runGarbageCollectionSweep();
    this.restorePendingSchedules();
  }

  public static getInstance(): PrerecordedStreamerService {
    if (!PrerecordedStreamerService.instance) {
      PrerecordedStreamerService.instance = new PrerecordedStreamerService();
    }
    return PrerecordedStreamerService.instance;
  }

  public getStorageDir(): string {
    return this.storageDir;
  }

  /**
   * Schedule a pre-recorded broadcast with strict 40-minute limit and 72-hour window
   */
  public async scheduleBroadcast(options: ScheduleOptions): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Validate max duration: strictly <= 40 minutes (2400s)
      if (options.durationSeconds > 2400) {
        return {
          success: false,
          error: `Video duration exceeds 40 minutes limit (${Math.round(options.durationSeconds / 60)}m ${options.durationSeconds % 60}s). Please upload or select a video of 40 minutes or less.`,
        };
      }

      // 2. Validate max schedule window: strictly <= 72 hours from now
      const now = Date.now();
      const schedTime = options.scheduledAt.getTime();
      const maxAllowed = now + 72 * 60 * 60 * 1000; // 72 hours in ms

      if (schedTime > maxAllowed) {
        return {
          success: false,
          error: 'Broadcast cannot be scheduled more than 72 hours (3 days) in advance.',
        };
      }

      if (schedTime < now - 60000) {
        return {
          success: false,
          error: 'Scheduled time must be in the future.',
        };
      }

      // 3. Update Broadcast in Database
      await prisma.broadcast.update({
        where: { id: options.broadcastId },
        data: {
          title: options.title,
          status: 'SCHEDULED',
          scheduledAt: options.scheduledAt,
          settings: {
            isPrerecorded: true,
            videoFilePath: options.videoFilePath,
            durationSeconds: options.durationSeconds,
            destinationIds: options.destinationIds,
            directDestinations: options.directDestinations || [],
          },
        },
      });

      // 4. Register in ScheduledJob model for audit & recovery
      await prisma.scheduledJob.create({
        data: {
          jobType: 'PRERECORDED_BROADCAST',
          scheduledAt: options.scheduledAt,
          status: 'QUEUED',
          payload: {
            broadcastId: options.broadcastId,
            videoFilePath: options.videoFilePath,
            durationSeconds: options.durationSeconds,
            destinationIds: options.destinationIds,
            directDestinations: options.directDestinations || [],
          },
        },
      });

      // 5. Setup execution timer
      this.armBroadcastTimer(options.broadcastId, options.scheduledAt);

      console.log(`[PreRecordedStreamer] Scheduled broadcast "${options.title}" (${options.broadcastId}) for ${options.scheduledAt.toISOString()} (Duration: ${options.durationSeconds}s)`);
      return { success: true };
    } catch (err: any) {
      console.error('[PreRecordedStreamer] scheduleBroadcast error:', err);
      return { success: false, error: err.message || 'Failed to schedule pre-recorded broadcast' };
    }
  }

  /**
   * Arm a timer to trigger the broadcast at the exact scheduled timestamp
   */
  private armBroadcastTimer(broadcastId: string, scheduledAt: Date) {
    if (this.scheduledTimers.has(broadcastId)) {
      clearTimeout(this.scheduledTimers.get(broadcastId)!);
      this.scheduledTimers.delete(broadcastId);
    }

    const delayMs = Math.max(0, scheduledAt.getTime() - Date.now());

    // If within 24 days (Node setTimeout max is ~24.8 days, 72h is well within limit)
    const timer = setTimeout(() => {
      this.startPrerecordedStream(broadcastId);
    }, delayMs);

    this.scheduledTimers.set(broadcastId, timer);
  }

  /**
   * Start streaming pre-recorded video directly to RTMP destinations via FFmpeg
   */
  public async startPrerecordedStream(broadcastId: string): Promise<void> {
    try {
      this.scheduledTimers.delete(broadcastId);

      const broadcast = await prisma.broadcast.findUnique({
        where: { id: broadcastId },
        include: { workspace: true },
      });

      if (!broadcast) {
        console.warn(`[PreRecordedStreamer] Broadcast ${broadcastId} not found`);
        return;
      }

      const settings = (broadcast.settings as Record<string, any>) || {};
      const videoFilePath = settings.videoFilePath as string;

      if (!videoFilePath || !fs.existsSync(videoFilePath)) {
        console.error(`[PreRecordedStreamer] Video file missing on VPS for broadcast ${broadcastId}: ${videoFilePath}`);
        await this.handleBroadcastFailure(broadcastId, 'Video file missing from VPS storage', videoFilePath);
        return;
      }

      // Resolve RTMP destination URLs
      const streamer = RtmpStreamerService.getInstance();
      const rtmpUrls = await streamer.resolveDestinationUrls(
        settings.destinationIds || [],
        settings.directDestinations || []
      );

      if (rtmpUrls.length === 0) {
        console.error(`[PreRecordedStreamer] No valid RTMP destinations found for broadcast ${broadcastId}`);
        await this.handleBroadcastFailure(broadcastId, 'No valid RTMP destinations found', videoFilePath);
        return;
      }

      // Update broadcast state to LIVE
      await prisma.broadcast.update({
        where: { id: broadcastId },
        data: {
          status: 'LIVE',
          startedAt: new Date(),
        },
      });

      console.log(`[PreRecordedStreamer] Starting live FFmpeg stream for "${broadcast.title}" to ${rtmpUrls.length} destination(s)`);

      const procs: ChildProcess[] = [];

      for (const targetUrl of rtmpUrls) {
        // Broadcast-grade real-time FFmpeg pipe reading video file at native rate (-re)
        const args = [
          '-re',
          '-i', videoFilePath,
          '-c:v', 'libx264',
          '-preset', 'veryfast',
          '-b:v', '3000k',
          '-maxrate', '3500k',
          '-bufsize', '6000k',
          '-pix_fmt', 'yuv420p',
          '-g', '60',
          '-r', '30',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-ar', '44100',
          '-f', 'flv',
          '-flvflags', 'no_duration_filesize',
          '-rtmp_live', 'live',
          targetUrl,
        ];

        const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });

        proc.stderr?.on('data', (d) => {
          // Log errors or stats if needed
          const line = d.toString();
          if (line.includes('error') || line.includes('fatal')) {
            console.warn(`[PreRecordedStreamer FFmpeg Error - ${broadcastId}]:`, line.trim());
          }
        });

        procs.push(proc);
      }

      this.activeStreams.set(broadcastId, procs);

      // Handle process completion on the primary stream
      const primaryProc = procs[0];
      primaryProc.on('close', async (code) => {
        this.activeStreams.delete(broadcastId);

        if (code === 0) {
          // ── SUCCESSFUL BROADCAST COMPLETION ─────────────────────────
          console.log(`[PreRecordedStreamer] Broadcast ${broadcastId} finished successfully! Unlinking video from VPS immediately.`);
          
          await prisma.broadcast.update({
            where: { id: broadcastId },
            data: {
              status: 'ENDED',
              endedAt: new Date(),
            },
          });

          // IMMEDIATELY DELETE VIDEO FROM VPS DISK (Zero storage waste!)
          if (fs.existsSync(videoFilePath)) {
            try {
              await fs.promises.unlink(videoFilePath);
              console.log(`[PreRecordedStreamer] Video file ${videoFilePath} successfully deleted from VPS disk.`);
            } catch (unlinkErr) {
              console.warn('[PreRecordedStreamer] Error unlinking video:', unlinkErr);
            }
          }
        } else {
          // ── BROADCAST FAILURE ──────────────────────────────────────
          await this.handleBroadcastFailure(broadcastId, `FFmpeg exited with error code ${code}`, videoFilePath);
        }
      });
    } catch (err: any) {
      console.error(`[PreRecordedStreamer] Fatal streaming error for ${broadcastId}:`, err);
      const broadcast = await prisma.broadcast.findUnique({ where: { id: broadcastId } });
      const settings = (broadcast?.settings as Record<string, any>) || {};
      await this.handleBroadcastFailure(broadcastId, err.message, settings.videoFilePath);
    }
  }

  /**
   * Handle broadcast failure: mark FAILED and log 24-hour cleanup deadline
   */
  private async handleBroadcastFailure(broadcastId: string, errorReason: string, videoFilePath?: string) {
    console.error(`[PreRecordedStreamer] Broadcast ${broadcastId} FAILED: ${errorReason}`);
    try {
      await prisma.broadcast.update({
        where: { id: broadcastId },
        data: {
          status: 'FAILED',
          endedAt: new Date(),
          settings: {
            failedAt: new Date(),
            failureReason: errorReason,
            cleanupAfter: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24-hour auto-delete
            videoFilePath,
          },
        },
      });
    } catch (dbErr) {
      console.warn('[PreRecordedStreamer] DB failure status update warning:', dbErr);
    }
  }

  /**
   * Cancel and delete a scheduled pre-recorded broadcast and remove file immediately from VPS
   */
  public async cancelScheduledBroadcast(broadcastId: string): Promise<boolean> {
    try {
      // 1. Cancel running timer if armed
      if (this.scheduledTimers.has(broadcastId)) {
        clearTimeout(this.scheduledTimers.get(broadcastId)!);
        this.scheduledTimers.delete(broadcastId);
      }

      // 2. Kill active FFmpeg streams if running
      const activeProcs = this.activeStreams.get(broadcastId);
      if (activeProcs) {
        activeProcs.forEach((p) => {
          try {
            p.kill('SIGTERM');
          } catch {}
        });
        this.activeStreams.delete(broadcastId);
      }

      // 3. Find broadcast and unlink video file from VPS
      const broadcast = await prisma.broadcast.findUnique({ where: { id: broadcastId } });
      if (broadcast) {
        const settings = (broadcast.settings as Record<string, any>) || {};
        const videoFilePath = settings.videoFilePath as string;

        if (videoFilePath && fs.existsSync(videoFilePath)) {
          await fs.promises.unlink(videoFilePath).catch(() => null);
          console.log(`[PreRecordedStreamer] Deleted video file ${videoFilePath} from VPS for canceled broadcast ${broadcastId}`);
        }

        await prisma.broadcast.update({
          where: { id: broadcastId },
          data: { status: 'ENDED', endedAt: new Date() },
        });
      }

      return true;
    } catch (err) {
      console.error(`[PreRecordedStreamer] Failed to cancel scheduled broadcast ${broadcastId}:`, err);
      return false;
    }
  }

  /**
   * 24-Hour Garbage Collection Sweep:
   * Removes any files from failed/orphaned pre-recorded streams older than 24 hours
   */
  public async runGarbageCollectionSweep(): Promise<void> {
    try {
      if (!fs.existsSync(this.storageDir)) return;
      const files = await fs.promises.readdir(this.storageDir);
      const now = Date.now();
      const twentyFourHours = 24 * 60 * 60 * 1000;

      for (const file of files) {
        const fullPath = path.join(this.storageDir, file);
        try {
          const stats = await fs.promises.stat(fullPath);
          const ageMs = now - stats.mtimeMs;

          if (ageMs > twentyFourHours) {
            await fs.promises.unlink(fullPath);
            console.log(`[PreRecordedStreamer GC] 24-Hour Cleanup: Removed expired/failed video file from VPS: ${file}`);
          }
        } catch {
          // ignore single file stat errors
        }
      }
    } catch (gcErr) {
      console.warn('[PreRecordedStreamer GC] Sweep warning:', gcErr);
    }
  }

  /**
   * Restore pending scheduled broadcasts upon backend server reboot
   */
  private async restorePendingSchedules(): Promise<void> {
    try {
      const now = new Date();
      const pendingBroadcasts = await prisma.broadcast.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledAt: { gte: now },
        },
      });

      for (const b of pendingBroadcasts) {
        const settings = (b.settings as Record<string, any>) || {};
        if (settings.isPrerecorded && b.scheduledAt) {
          this.armBroadcastTimer(b.id, b.scheduledAt);
          console.log(`[PreRecordedStreamer] Restored scheduled timer for broadcast: "${b.title}" (${b.id}) at ${b.scheduledAt.toISOString()}`);
        }
      }
    } catch (e) {
      console.warn('[PreRecordedStreamer] restorePendingSchedules warning:', e);
    }
  }
}
