import express, { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { BroadcastStatus } from '@prisma/client';
import { RtmpStreamerService } from '../services/rtmp-streamer.service';
import { PrerecordedStreamerService } from '../services/prerecorded-streamer.service';
import {
  HttpError,
  getAccessibleBroadcast,
  getAccessibleStudio,
  getUserWorkspaceIds,
  resolveWorkspaceId,
} from '../lib/access';
import { uploadsSubdir } from '../lib/paths';
import { takeCompletedUpload } from './upload.routes';

// Mounted behind requireAuth in server.ts
const router = Router({ mergeParams: true });

const prerecordedDir = PrerecordedStreamerService.getInstance().getStorageDir();
/** broadcastId -> user who started the live session (only they may push chunks). */
const streamOwners = new Map<string, string>();
const SESSION_MEDIA_DIR = uploadsSubdir('session-media');

const uploadPrerecorded = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, prerecordedDir),
    filename: (_req, file, cb) => {
      const ext = (path.extname(file.originalname) || '.mp4').replace(/[^a-zA-Z0-9.]/g, '');
      cb(null, `prerecorded-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`);
    },
  }),
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB (files > 90MB arrive via chunked /api/uploads)
});

const BroadcastSchema = z.object({
  title: z.string().min(1, 'Broadcast title is required'),
  studioId: z.string().optional(),
  workspaceId: z.string().optional(),
  destinationIds: z.array(z.string()).optional().default([]),
  scheduledAt: z.string().datetime().optional(),
  settings: z.record(z.unknown()).optional(),
});

const StateTransitionSchema = z.object({
  action: z.enum(['start', 'stop', 'pause', 'resume']),
  destinationIds: z.array(z.string()).optional(),
});

const StartStreamSchema = z.object({
  destinationIds: z.array(z.string()).optional().default([]),
  roomName: z.string().optional(),
  directDestinations: z
    .array(z.object({ rtmpUrl: z.string(), streamKey: z.string().optional() }))
    .optional()
    .default([]),
});

async function resolveStudioForCreate(req: Request, studioId?: string) {
  if (studioId) return getAccessibleStudio(req, studioId, { createIfMissing: true });
  const workspaceId = await resolveWorkspaceId(req);
  const studio = await prisma.studio.findFirst({ where: { workspaceId } });
  if (studio) return studio;
  return prisma.studio.create({ data: { workspaceId, name: 'Main Studio', description: 'Primary Production Studio' } });
}

function publicBroadcast<T extends { settings: unknown }>(b: T): T {
  const settings = { ...((b.settings as Record<string, any>) || {}) };
  // never send stored stream keys or server paths to the browser
  delete settings.directDestinations;
  delete settings.videoFilePath;
  return { ...b, settings };
}

// POST /api/broadcasts
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = BroadcastSchema.parse(req.body);
    const studio = await resolveStudioForCreate(req, data.studioId);
    const broadcast = await prisma.broadcast.create({
      data: {
        title: data.title,
        studioId: studio.id,
        workspaceId: studio.workspaceId,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        settings: { destinationIds: data.destinationIds, ...(data.settings || {}) } as any,
        status: data.scheduledAt ? 'SCHEDULED' : 'DRAFT',
      },
      include: { studio: { select: { id: true, name: true } } },
    });
    res.status(201).json({ success: true, data: publicBroadcast(broadcast) });
  } catch (error) {
    next(error);
  }
});

// GET /api/broadcasts
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ids = await getUserWorkspaceIds(req.user!.id);
    const broadcasts = await prisma.broadcast.findMany({
      where: { workspaceId: { in: ids } },
      include: {
        studio: { select: { id: true, name: true } },
        _count: { select: { participants: true, recordings: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json({ success: true, data: broadcasts.map(publicBroadcast) });
  } catch (error) {
    next(error);
  }
});

// GET /api/broadcasts/scheduled  (must be registered before /:broadcastId)
router.get('/scheduled', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ids = await getUserWorkspaceIds(req.user!.id);
    const broadcasts = await prisma.broadcast.findMany({
      where: { status: { in: ['SCHEDULED', 'LIVE'] }, workspaceId: { in: ids } },
      orderBy: { scheduledAt: 'asc' },
    });
    const formatted = broadcasts.map((b) => {
      const settings = (b.settings as Record<string, any>) || {};
      return {
        id: b.id,
        title: b.title,
        status: b.status,
        scheduledAt: b.scheduledAt,
        durationSeconds: settings.durationSeconds || 0,
        fileName: settings.fileName || 'Pre-recorded Video',
        isPrerecorded: !!settings.isPrerecorded,
        destinationsCount: (settings.destinationIds?.length || 0) + (settings.directDestinations?.length || 0),
      };
    });
    res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
});

// GET /api/broadcasts/:broadcastId
router.get('/:broadcastId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const b = await getAccessibleBroadcast(req, req.params.broadcastId);
    const broadcast = await prisma.broadcast.findUnique({
      where: { id: b.id },
      include: { studio: true, participants: true, recordings: true },
    });
    res.status(200).json({ success: true, data: publicBroadcast(broadcast!) });
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) {
      // Studio pages probe their broadcast on load; a missing one is normal.
      res.status(404).json({ success: false, error: 'Broadcast not found' });
      return;
    }
    next(error);
  }
});

// POST /api/broadcasts/:broadcastId/state
router.post('/:broadcastId/state', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { action, destinationIds } = StateTransitionSchema.parse(req.body);
    const broadcast = await getAccessibleBroadcast(req, req.params.broadcastId);

    let nextStatus: BroadcastStatus = broadcast.status;
    const updateData: Record<string, unknown> = {};
    switch (action) {
      case 'start':
        nextStatus = 'LIVE';
        updateData.startedAt = new Date();
        break;
      case 'stop':
        nextStatus = 'ENDED';
        updateData.endedAt = new Date();
        break;
      case 'pause':
        nextStatus = 'READY';
        break;
      case 'resume':
        nextStatus = 'LIVE';
        break;
    }
    updateData.status = nextStatus;
    if (destinationIds) {
      updateData.settings = { ...((broadcast.settings as Record<string, unknown>) || {}), destinationIds };
    }
    const updated = await prisma.broadcast.update({ where: { id: broadcast.id }, data: updateData });
    res.status(200).json({ success: true, data: publicBroadcast(updated) });
  } catch (error) {
    next(error);
  }
});

// POST /api/broadcasts/:broadcastId/stream/start
router.post('/:broadcastId/stream/start', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = StartStreamSchema.parse(req.body || {});
    // Studio pages use the studio id as broadcast id; make sure a DB record exists so status/media
    // cleanup know the studio is live.
    const broadcast = await getAccessibleBroadcast(req, req.params.broadcastId, { createForStudio: true });
    const workspaceIds = req.user!.role === 'SUPER_ADMIN' ? undefined : await getUserWorkspaceIds(req.user!.id);

    const result = await RtmpStreamerService.getInstance().startBroadcastStream(
      broadcast.id,
      body.roomName || `studio-${broadcast.id}`,
      body.destinationIds,
      body.directDestinations,
      workspaceIds
    );
    if (result.success) streamOwners.set(broadcast.id, req.user!.id);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/broadcasts/:broadcastId/stream/status
router.get('/:broadcastId/stream/status', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const broadcast = await getAccessibleBroadcast(req, req.params.broadcastId).catch(() => null);
    const status = RtmpStreamerService.getInstance().getStatus(broadcast ? broadcast.id : '__none__');
    res.status(200).json({ success: true, data: status });
  } catch (error) {
    next(error);
  }
});

// POST /api/broadcasts/:broadcastId/stream/chunk
// Headers: X-Stream-Epoch (MediaRecorder run), X-Chunk-Seq (index within the run; 0 = WebM header)
router.post(
  '/:broadcastId/stream/chunk',
  express.raw({ type: '*/*', limit: '50mb' }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const streamer = RtmpStreamerService.getInstance();
      const session = streamer.getSession(req.params.broadcastId.replace(/^studio-/, ''));
      if (!session) {
        res.status(409).json({ success: false, sessionLost: true, error: 'No active stream session' });
        return;
      }
      const seq = parseInt(String(req.headers['x-chunk-seq'] ?? '0'), 10) || 0;
      const epoch = parseInt(String(req.headers['x-stream-epoch'] ?? '0'), 10) || 0;
      const owner = streamOwners.get(session.broadcastId);
      if (owner !== req.user!.id) {
        // e.g. API restarted, or the host re-opened the studio: fall back to a full access check
        await getAccessibleBroadcast(req, session.broadcastId);
        streamOwners.set(session.broadcastId, req.user!.id);
      }

      const chunk = Buffer.isBuffer(req.body) ? req.body : null;
      if (!chunk || chunk.length === 0) {
        res.status(400).json({ success: false, error: 'Empty chunk' });
        return;
      }
      const result = streamer.pushChunk(session.broadcastId, chunk, epoch, seq);
      if (result.sessionLost) {
        res.status(409).json({ success: false, sessionLost: true });
        return;
      }
      if (result.fatal) {
        res.status(410).json({ success: false, fatal: true, error: result.fatal });
        return;
      }
      res.status(200).json({ success: true, restart: Boolean(result.restart), size: chunk.length });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/broadcasts/:broadcastId/stream/stop
router.post('/:broadcastId/stream/stop', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const broadcast = await getAccessibleBroadcast(req, req.params.broadcastId).catch(() => null);
    if (!broadcast) {
      res.status(200).json({ success: false });
      return;
    }
    const success = await RtmpStreamerService.getInstance().stopBroadcastStream(broadcast.id);
    streamOwners.delete(broadcast.id);
    try {
      const { deleteSessionMedia } = await import('./media.routes');
      await deleteSessionMedia(broadcast.id);
    } catch (cleanupErr) {
      console.warn('[Broadcast Stop] Session media cleanup error:', cleanupErr);
    }
    res.status(200).json({ success });
  } catch (error) {
    next(error);
  }
});

// POST /api/broadcasts/schedule-prerecorded
// multipart `video` (≤1GB) | `uploadId` (chunked upload) | `mediaAssetId` (existing library video)
router.post('/schedule-prerecorded', uploadPrerecorded.single('video'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  let ownedTempFile: string | null = req.file?.path || null;
  try {
    const { title, scheduledAt, studioId, mediaAssetId } = req.body;
    const duration = parseFloat(req.body.duration || '0') || 0;

    if (!title || !String(title).trim()) throw new HttpError(400, 'Broadcast title is required');
    if (duration > 2400) {
      throw new HttpError(
        400,
        `Video exceeds maximum allowed duration of 40 minutes (${Math.round(duration / 60)}m ${Math.round(duration % 60)}s). Please choose a video of 40 minutes or less.`
      );
    }
    const schedDate = new Date(scheduledAt);
    const now = Date.now();
    if (isNaN(schedDate.getTime()) || schedDate.getTime() < now - 60000) {
      throw new HttpError(400, 'Please choose a valid future broadcast date and time.');
    }
    if (schedDate.getTime() > now + 72 * 60 * 60 * 1000) {
      throw new HttpError(400, 'Broadcast cannot be scheduled more than 72 hours (3 days) in advance to prevent VPS storage clogs.');
    }

    let videoFilePath = '';
    let fileName = '';
    let ownsVideoFile = false; // only files uploaded for this schedule are deleted afterwards

    if (req.file) {
      videoFilePath = req.file.path;
      fileName = req.file.originalname;
      ownsVideoFile = true;
    } else if (typeof req.body.uploadId === 'string' && req.body.uploadId) {
      const taken = await takeCompletedUpload(req, req.body.uploadId);
      ownedTempFile = taken.path;
      const target = path.join(prerecordedDir, `prerecorded-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp4`);
      await fs.promises.rename(taken.path, target);
      ownedTempFile = target;
      videoFilePath = target;
      fileName = taken.originalname;
      ownsVideoFile = true;
    } else if (mediaAssetId) {
      const asset = await prisma.mediaAsset.findUnique({ where: { id: String(mediaAssetId) } });
      if (!asset) throw new HttpError(404, 'Selected media asset not found');
      if (!(await getUserWorkspaceIds(req.user!.id)).includes(asset.workspaceId) && req.user!.role !== 'SUPER_ADMIN') {
        throw new HttpError(404, 'Selected media asset not found');
      }
      if (!asset.storagePath.startsWith('local://')) {
        throw new HttpError(400, 'Media asset storage format not supported for local streaming');
      }
      fileName = asset.name;
      videoFilePath = path.join(SESSION_MEDIA_DIR, path.basename(asset.storagePath.replace('local://', '')));
    } else {
      throw new HttpError(400, 'Video file or media asset is required for scheduling.');
    }

    if (!fs.existsSync(videoFilePath)) throw new HttpError(400, 'Video file could not be accessed on the server.');

    let destinationIds: string[] = [];
    let directDestinations: any[] = [];
    try {
      if (req.body.destinationIds) {
        destinationIds = typeof req.body.destinationIds === 'string' ? JSON.parse(req.body.destinationIds) : req.body.destinationIds;
      }
      if (req.body.directDestinations) {
        directDestinations =
          typeof req.body.directDestinations === 'string' ? JSON.parse(req.body.directDestinations) : req.body.directDestinations;
      }
    } catch {
      throw new HttpError(400, 'Invalid destination list');
    }

    const studio = await resolveStudioForCreate(req, studioId ? String(studioId) : undefined);
    const broadcast = await prisma.broadcast.create({
      data: {
        title: String(title).trim(),
        studioId: studio.id,
        workspaceId: studio.workspaceId,
        status: 'SCHEDULED',
        scheduledAt: schedDate,
        settings: {},
      },
    });

    const result = await PrerecordedStreamerService.getInstance().scheduleBroadcast({
      broadcastId: broadcast.id,
      title: String(title).trim(),
      workspaceId: studio.workspaceId,
      videoFilePath,
      fileName,
      ownsVideoFile,
      durationSeconds: duration,
      scheduledAt: schedDate,
      destinationIds,
      directDestinations,
    });
    if (!result.success) {
      await prisma.broadcast.delete({ where: { id: broadcast.id } }).catch(() => null);
      throw new HttpError(400, result.error || 'Failed to schedule broadcast');
    }
    ownedTempFile = null; // now owned by the scheduler

    res.status(201).json({
      success: true,
      data: {
        id: broadcast.id,
        title: broadcast.title,
        status: 'SCHEDULED',
        scheduledAt: schedDate,
        durationSeconds: duration,
        fileName,
      },
    });
  } catch (error) {
    next(error);
  } finally {
    if (ownedTempFile) await fs.promises.unlink(ownedTempFile).catch(() => null);
  }
});

// DELETE /api/broadcasts/scheduled/:id
router.delete('/scheduled/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const broadcast = await getAccessibleBroadcast(req, req.params.id);
    const canceled = await PrerecordedStreamerService.getInstance().cancelScheduledBroadcast(broadcast.id);
    if (canceled) {
      res.status(200).json({ success: true, message: 'Scheduled broadcast canceled and video deleted from VPS' });
    } else {
      res.status(404).json({ success: false, error: 'Broadcast not found or could not be canceled' });
    }
  } catch (error) {
    next(error);
  }
});

// DELETE /api/broadcasts/:broadcastId
router.delete('/:broadcastId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const broadcast = await getAccessibleBroadcast(req, req.params.broadcastId);
    if (broadcast.status === 'LIVE') throw new HttpError(409, 'End the live broadcast before deleting it');
    await prisma.broadcast.delete({ where: { id: broadcast.id } });
    res.status(200).json({ success: true, data: { id: broadcast.id, deleted: true } });
  } catch (error) {
    next(error);
  }
});

export default router;
