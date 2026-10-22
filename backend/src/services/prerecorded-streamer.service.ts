import fs from 'fs';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { prisma } from '../lib/prisma';
import { RtmpStreamerService, redactRtmp, rtmpOutputArgs } from './rtmp-streamer.service';
import { uploadsSubdir } from '../lib/paths';

export interface ScheduleOptions {
  broadcastId: string;
  title: string;
  workspaceId: string;
  videoFilePath: string;
  fileName?: string;
  /** true when the file was uploaded only for this schedule (deleted afterwards); false for library media */
  ownsVideoFile?: boolean;
  durationSeconds: number;
  scheduledAt: Date;
  destinationIds: string[];
  directDestinations?: Array<{ name?: string; rtmpUrl: string; streamKey: string }>;
}

/** A scheduled start that was missed (server was down) is still started if we are at most this late. */
const MISSED_START_GRACE_MS = 10 * 60 * 1000;

export class PrerecordedStreamerService extends EventEmitter {
  private static instance: PrerecordedStreamerService;
  private readonly scheduledTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly activeStreams: Map<string, ChildProcess> = new Map();
  private readonly storageDir: string;

  private constructor() {
    super();
    this.storageDir = uploadsSubdir('prerecorded');
    setInterval(() => void this.runGarbageCollectionSweep(), 60 * 60 * 1000);
    void this.runGarbageCollectionSweep();
    void this.restorePendingSchedules();
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

  private async mergeSettings(broadcastId: string, patch: Record<string, unknown>) {
    const b = await prisma.broadcast.findUnique({ where: { id: broadcastId }, select: { settings: true } });
    return { ...((b?.settings as Record<string, unknown>) || {}), ...patch };
  }

  public async scheduleBroadcast(options: ScheduleOptions): Promise<{ success: boolean; error?: string }> {
    try {
      if (options.durationSeconds > 2400) {
        return {
          success: false,
          error: `Video duration exceeds 40 minutes limit (${Math.round(options.durationSeconds / 60)}m). Please upload or select a video of 40 minutes or less.`,
        };
      }
      const now = Date.now();
      const schedTime = options.scheduledAt.getTime();
      if (schedTime > now + 72 * 60 * 60 * 1000) {
        return { success: false, error: 'Broadcast cannot be scheduled more than 72 hours (3 days) in advance.' };
      }
      if (schedTime < now - 60000) {
        return { success: false, error: 'Scheduled time must be in the future.' };
      }

      await prisma.broadcast.update({
        where: { id: options.broadcastId },
        data: {
          title: options.title,
          status: 'SCHEDULED',
          scheduledAt: options.scheduledAt,
          settings: (await this.mergeSettings(options.broadcastId, {
            isPrerecorded: true,
            videoFilePath: options.videoFilePath,
            fileName: options.fileName || path.basename(options.videoFilePath),
            ownsVideoFile: Boolean(options.ownsVideoFile),
            durationSeconds: options.durationSeconds,
            destinationIds: options.destinationIds,
            directDestinations: options.directDestinations || [],
          })) as any,
        },
      });

      await prisma.scheduledJob
        .create({
          data: {
            jobType: 'PRERECORDED_BROADCAST',
            scheduledAt: options.scheduledAt,
            status: 'QUEUED',
            payload: { broadcastId: options.broadcastId },
          },
        })
        .catch(() => null);

      this.armBroadcastTimer(options.broadcastId, options.scheduledAt);
      console.log(`[PreRecordedStreamer] Scheduled "${options.title}" (${options.broadcastId}) for ${options.scheduledAt.toISOString()}`);
      return { success: true };
    } catch (err: any) {
      console.error('[PreRecordedStreamer] scheduleBroadcast error:', err);
      return { success: false, error: err.message || 'Failed to schedule pre-recorded broadcast' };
    }
  }

  private armBroadcastTimer(broadcastId: string, scheduledAt: Date) {
    const existing = this.scheduledTimers.get(broadcastId);
    if (existing) clearTimeout(existing);
    const delayMs = Math.max(0, scheduledAt.getTime() - Date.now());
    this.scheduledTimers.set(
      broadcastId,
      setTimeout(() => void this.startPrerecordedStream(broadcastId), delayMs)
    );
  }

  private async deleteOwnedFile(settings: Record<string, any>) {
    const filePath = settings.videoFilePath as string | undefined;
    if (!filePath || !settings.ownsVideoFile) return; // never delete the user's media-library file
    const safe = path.join(this.storageDir, path.basename(filePath));
    if (safe !== filePath) return;
    await fs.promises.unlink(safe).catch(() => null);
  }

  public async startPrerecordedStream(broadcastId: string): Promise<void> {
    this.scheduledTimers.delete(broadcastId);
    try {
      const broadcast = await prisma.broadcast.findUnique({ where: { id: broadcastId } });
      if (!broadcast || broadcast.status !== 'SCHEDULED') return;

      const settings = (broadcast.settings as Record<string, any>) || {};
      const videoFilePath = settings.videoFilePath as string;
      if (!videoFilePath || !fs.existsSync(videoFilePath)) {
        await this.handleBroadcastFailure(broadcastId, 'Video file missing from server storage');
        return;
      }

      const rtmpUrls = await RtmpStreamerService.getInstance().resolveDestinationUrls(
        settings.destinationIds || [],
        settings.directDestinations || [],
        [broadcast.workspaceId]
      );
      if (rtmpUrls.length === 0) {
        await this.handleBroadcastFailure(broadcastId, 'No valid RTMP destinations found');
        return;
      }

      await prisma.broadcast.update({ where: { id: broadcastId }, data: { status: 'LIVE', startedAt: new Date() } });
      console.log(`[PreRecordedStreamer] Going live with "${broadcast.title}" -> ${rtmpUrls.length} destination(s)`);

      // One read + one encode, fanned out to every destination with the tee muxer.
      const args = [
        '-hide_banner',
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
        '-rw_timeout', '15000000',
        ...rtmpOutputArgs(rtmpUrls),
      ];

      const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
      this.activeStreams.set(broadcastId, proc);
      let lastErrorLine = '';
      proc.stderr?.on('data', (d) => {
        for (const raw of d.toString().split(/[\r\n]+/)) {
          const line = raw.trim();
          if (!line) continue;
          if (/error|fatal|failed|refused/i.test(line)) {
            lastErrorLine = redactRtmp(line);
            console.warn(`[PreRecordedStreamer FFmpeg - ${broadcastId}]:`, lastErrorLine);
          }
        }
      });

      proc.on('close', async (code) => {
        this.activeStreams.delete(broadcastId);
        const current = await prisma.broadcast.findUnique({ where: { id: broadcastId } });
        if (!current || current.status !== 'LIVE') return; // canceled meanwhile
        if (code === 0) {
          await prisma.broadcast.update({ where: { id: broadcastId }, data: { status: 'ENDED', endedAt: new Date() } });
          await this.deleteOwnedFile((current.settings as Record<string, any>) || {});
          console.log(`[PreRecordedStreamer] Broadcast ${broadcastId} finished.`);
        } else {
          await this.handleBroadcastFailure(broadcastId, `FFmpeg exited with code ${code}${lastErrorLine ? `: ${lastErrorLine}` : ''}`);
        }
      });
    } catch (err: any) {
      console.error(`[PreRecordedStreamer] Fatal streaming error for ${broadcastId}:`, err);
      await this.handleBroadcastFailure(broadcastId, err.message || 'Unknown error');
    }
  }

  /** Mark FAILED, keeping existing settings; the file is removed by the 24h GC sweep. */
  private async handleBroadcastFailure(broadcastId: string, errorReason: string) {
    console.error(`[PreRecordedStreamer] Broadcast ${broadcastId} FAILED: ${errorReason}`);
    try {
      await prisma.broadcast.update({
        where: { id: broadcastId },
        data: {
          status: 'FAILED',
          endedAt: new Date(),
          settings: (await this.mergeSettings(broadcastId, {
            failedAt: new Date().toISOString(),
            failureReason: errorReason,
            cleanupAfter: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          })) as any,
        },
      });
    } catch (dbErr) {
      console.warn('[PreRecordedStreamer] DB failure status update warning:', dbErr);
    }
  }

  public async cancelScheduledBroadcast(broadcastId: string): Promise<boolean> {
    try {
      const timer = this.scheduledTimers.get(broadcastId);
      if (timer) clearTimeout(timer);
      this.scheduledTimers.delete(broadcastId);

      const broadcast = await prisma.broadcast.findUnique({ where: { id: broadcastId } });
      if (!broadcast) return false;

      // Mark ENDED first so the ffmpeg close handler does not record it as a failure.
      await prisma.broadcast.update({ where: { id: broadcastId }, data: { status: 'ENDED', endedAt: new Date() } });

      const proc = this.activeStreams.get(broadcastId);
      if (proc) {
        try {
          proc.kill('SIGTERM');
        } catch { }
        this.activeStreams.delete(broadcastId);
      }

      await this.deleteOwnedFile((broadcast.settings as Record<string, any>) || {});
      return true;
    } catch (err) {
      console.error(`[PreRecordedStreamer] Failed to cancel scheduled broadcast ${broadcastId}:`, err);
      return false;
    }
  }

  /**
   * Hourly sweep: remove files in the prerecorded folder older than 24h that are NOT needed by a
   * SCHEDULED/LIVE broadcast (videos may legitimately wait up to 72h for their slot).
   */
  public async runGarbageCollectionSweep(): Promise<void> {
    try {
      const pending = await prisma.broadcast.findMany({
        where: { status: { in: ['SCHEDULED', 'LIVE'] } },
        select: { settings: true },
      });
      const keep = new Set(
        pending
          .map((b) => ((b.settings as Record<string, any>) || {}).videoFilePath as string | undefined)
          .filter(Boolean)
          .map((p) => path.basename(p as string))
      );

      const files = await fs.promises.readdir(this.storageDir);
      const now = Date.now();
      for (const file of files) {
        if (keep.has(file)) continue;
        const fullPath = path.join(this.storageDir, file);
        const stats = await fs.promises.stat(fullPath).catch(() => null);
        if (stats && now - stats.mtimeMs > 24 * 60 * 60 * 1000) {
          await fs.promises.unlink(fullPath).catch(() => null);
          console.log(`[PreRecordedStreamer GC] Removed expired video file: ${file}`);
        }
      }
    } catch (gcErr) {
      console.warn('[PreRecordedStreamer GC] Sweep warning:', gcErr);
    }
  }

  /** Re-arm timers after a restart; start slightly-missed ones, fail the ones missed long ago. */
  private async restorePendingSchedules(): Promise<void> {
    try {
      const pending = await prisma.broadcast.findMany({ where: { status: 'SCHEDULED' } });
      const now = Date.now();
      for (const b of pending) {
        const settings = (b.settings as Record<string, any>) || {};
        if (!settings.isPrerecorded || !b.scheduledAt) continue;
        const late = now - b.scheduledAt.getTime();
        if (late > MISSED_START_GRACE_MS) {
          await this.handleBroadcastFailure(b.id, 'Server was offline at the scheduled start time');
          continue;
        }
        this.armBroadcastTimer(b.id, b.scheduledAt);
        console.log(`[PreRecordedStreamer] Restored timer for "${b.title}" (${b.id}) at ${b.scheduledAt.toISOString()}`);
      }
      // Anything still marked LIVE belongs to an ffmpeg that died with the previous process.
      const stale = await prisma.broadcast.findMany({ where: { status: 'LIVE' } });
      for (const b of stale) {
        if (((b.settings as Record<string, any>) || {}).isPrerecorded) {
          await this.handleBroadcastFailure(b.id, 'Server restarted during the broadcast');
        }
      }
    } catch (e) {
      console.warn('[PreRecordedStreamer] restorePendingSchedules warning:', e);
    }
  }
}
