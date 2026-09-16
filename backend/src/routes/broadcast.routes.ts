import express, { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { BroadcastStatus } from '@prisma/client';
import { RtmpStreamerService } from '../services/rtmp-streamer.service';
import { PrerecordedStreamerService } from '../services/prerecorded-streamer.service';

const router = Router({ mergeParams: true });

const prerecordedDir = path.join(process.cwd(), 'uploads', 'prerecorded');
if (!fs.existsSync(prerecordedDir)) {
  fs.mkdirSync(prerecordedDir, { recursive: true });
}

const prerecordedStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, prerecordedDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp4';
    cb(null, `prerecorded-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`);
  },
});

const uploadPrerecorded = multer({
  storage: prerecordedStorage,
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB max upload for 40 min 1080p
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

async function resolveStudioAndWorkspace(req: Request, studioId?: string, workspaceId?: string) {
  let wsId = workspaceId || (req.headers['x-workspace-id'] as string);
  if (!wsId) {
    const defaultWs = await prisma.workspace.findFirst({ orderBy: { createdAt: 'asc' } });
    if (defaultWs) {
      wsId = defaultWs.id;
    } else {
      const newWs = await prisma.workspace.create({
        data: {
          name: 'Default Workspace',
          slug: `default-${Date.now()}`,
          owner: {
            create: {
              email: `admin-${Date.now()}@livestudio.io`,
              passwordHash: 'seeded',
              name: 'Super Admin',
              role: 'SUPER_ADMIN',
            },
          },
        },
      });
      wsId = newWs.id;
    }
  }

  let sId = studioId;
  if (sId) {
    const existing = await prisma.studio.findUnique({ where: { id: sId } });
    if (existing) return { studioId: existing.id, workspaceId: existing.workspaceId };
  }

  // Find or create default studio in workspace
  let studio = await prisma.studio.findFirst({ where: { workspaceId: wsId } });
  if (!studio) {
    studio = await prisma.studio.create({
      data: {
        workspaceId: wsId,
        name: 'Main Studio',
        description: 'Primary Production Studio',
      },
    });
  }

  return { studioId: studio.id, workspaceId: wsId };
}

// POST /api/broadcasts
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = BroadcastSchema.parse(req.body);
    const { studioId, workspaceId } = await resolveStudioAndWorkspace(req, data.studioId, data.workspaceId);

    const broadcast = await prisma.broadcast.create({
      data: {
        title: data.title,
        studioId,
        workspaceId,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        settings: {
          destinationIds: data.destinationIds,
          ...(data.settings || {}),
        },
        status: data.scheduledAt ? 'SCHEDULED' : 'DRAFT',
      },
      include: {
        studio: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ success: true, data: broadcast });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors[0]?.message || 'Validation failed' });
      return;
    }
    next(error);
  }
});

// GET /api/broadcasts
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { workspaceId } = await resolveStudioAndWorkspace(req);
    const broadcasts = await prisma.broadcast.findMany({
      where: { workspaceId },
      include: {
        studio: { select: { id: true, name: true } },
        _count: {
          select: { participants: true, recordings: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ success: true, data: broadcasts });
  } catch (error) {
    next(error);
  }
});

// GET /api/broadcasts/:broadcastId
router.get('/:broadcastId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const broadcast = await prisma.broadcast.findUnique({
      where: { id: req.params.broadcastId },
      include: {
        studio: true,
        participants: true,
        recordings: true,
      },
    });

    if (!broadcast) {
      res.status(404).json({ success: false, error: 'Broadcast not found' });
      return;
    }

    res.status(200).json({ success: true, data: broadcast });
  } catch (error) {
    next(error);
  }
});

// POST /api/broadcasts/:broadcastId/state
router.post('/:broadcastId/state', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { action, destinationIds } = StateTransitionSchema.parse(req.body);
    const broadcast = await prisma.broadcast.findUnique({
      where: { id: req.params.broadcastId },
    });

    if (!broadcast) {
      res.status(404).json({ success: false, error: 'Broadcast not found' });
      return;
    }

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
      const currentSettings = (broadcast.settings as Record<string, unknown>) || {};
      updateData.settings = {
        ...currentSettings,
        destinationIds,
      };
    }

    const updated = await prisma.broadcast.update({
      where: { id: req.params.broadcastId },
      data: updateData,
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors[0]?.message || 'Validation failed' });
      return;
    }
    next(error);
  }
});

// POST /api/broadcasts/:broadcastId/stream/start
router.post('/:broadcastId/stream/start', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { destinationIds, roomName, directDestinations } = req.body;
    const streamer = RtmpStreamerService.getInstance();

    const result = await streamer.startBroadcastStream(
      req.params.broadcastId,
      roomName || `studio-${req.params.broadcastId}`,
      destinationIds || [],
      directDestinations
    );

    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error(`[Broadcast API] /stream/start error:`, error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start RTMP broadcast stream',
    });
  }
});

// GET /api/broadcasts/:broadcastId/stream/status
router.get('/:broadcastId/stream/status', (req: Request, res: Response): void => {
  try {
    const streamer = RtmpStreamerService.getInstance();
    const status = streamer.getStatus(req.params.broadcastId);
    res.status(200).json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve stream status',
    });
  }
});

// POST /api/broadcasts/:broadcastId/stream/chunk
router.post(
  '/:broadcastId/stream/chunk',
  express.raw({ type: '*/*', limit: '50mb' }),
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const broadcastId = req.params.broadcastId;
      const streamer = RtmpStreamerService.getInstance();

      const chunkBuffer = Buffer.isBuffer(req.body)
        ? req.body
        : typeof req.body === 'string'
        ? Buffer.from(req.body)
        : null;

      if (chunkBuffer && chunkBuffer.length > 0) {
        streamer.pushChunk(broadcastId, chunkBuffer);
        res.status(200).json({ success: true, size: chunkBuffer.length });
        return;
      }

      // Stream fallback if body parser did not buffer
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      req.on('end', () => {
        const total = Buffer.concat(chunks);
        if (total.length > 0) {
          streamer.pushChunk(broadcastId, total);
        }
        res.status(200).json({ success: true, size: total.length });
      });
    } catch (error) {
      console.error(`[Stream Chunk Error - ${req.params.broadcastId}]:`, error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
);

// POST /api/broadcasts/:broadcastId/stream/stop
router.post('/:broadcastId/stream/stop', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const streamer = RtmpStreamerService.getInstance();
    const success = await streamer.stopBroadcastStream(req.params.broadcastId);

    // Immediately purge temporary session media upon End Broadcast
    try {
      const { deleteSessionMedia } = await import('./media.routes');
      await deleteSessionMedia(req.params.broadcastId);
    } catch (cleanupErr) {
      console.warn('[Broadcast Stop] Session media cleanup error:', cleanupErr);
    }

    res.status(200).json({ success });
  } catch (error) {
    console.error(`[Broadcast API] /stream/stop error:`, error);
    res.status(200).json({ success: true });
  }
});

// POST /api/broadcasts/schedule-prerecorded (Scheduled simulated live stream with 40m cap, 72h window, and auto-delete)
router.post('/schedule-prerecorded', uploadPrerecorded.single('video'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, scheduledAt, studioId, workspaceId, mediaAssetId } = req.body;
    const duration = parseFloat(req.body.duration || '0') || 0;

    if (!title || !title.trim()) {
      res.status(400).json({ success: false, error: 'Broadcast title is required' });
      return;
    }

    // 1. Validate max duration: strictly <= 40 minutes (2400s)
    if (duration > 2400) {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        await fs.promises.unlink(req.file.path).catch(() => null);
      }
      res.status(400).json({
        success: false,
        error: `Video exceeds maximum allowed duration of 40 minutes (${Math.round(duration / 60)}m ${Math.round(duration % 60)}s). Please choose a video of 40 minutes or less.`,
      });
      return;
    }

    // 2. Validate schedule time: strictly future and <= 72 hours
    const schedDate = new Date(scheduledAt);
    const now = Date.now();
    if (isNaN(schedDate.getTime()) || schedDate.getTime() < now - 60000) {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        await fs.promises.unlink(req.file.path).catch(() => null);
      }
      res.status(400).json({ success: false, error: 'Please choose a valid future broadcast date and time.' });
      return;
    }

    const maxAllowed = now + 72 * 60 * 60 * 1000;
    if (schedDate.getTime() > maxAllowed) {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        await fs.promises.unlink(req.file.path).catch(() => null);
      }
      res.status(400).json({
        success: false,
        error: 'Broadcast cannot be scheduled more than 72 hours (3 days) in advance to prevent VPS storage clogs.',
      });
      return;
    }

    // 3. Resolve video file path on VPS
    let videoFilePath = '';
    let fileName = '';

    if (req.file) {
      videoFilePath = req.file.path;
      fileName = req.file.originalname;
    } else if (mediaAssetId) {
      const asset = await prisma.mediaAsset.findUnique({ where: { id: mediaAssetId } });
      if (!asset) {
        res.status(404).json({ success: false, error: 'Selected media asset not found' });
        return;
      }
      fileName = asset.name;
      if (asset.storagePath.startsWith('local://')) {
        const relPath = asset.storagePath.replace('local://', '');
        videoFilePath = path.join(process.cwd(), 'uploads', 'session-media', relPath);
      } else {
        res.status(400).json({ success: false, error: 'Media asset storage format not supported for local streaming' });
        return;
      }
    } else {
      res.status(400).json({ success: false, error: 'Video file or media asset is required for scheduling.' });
      return;
    }

    if (!fs.existsSync(videoFilePath)) {
      res.status(400).json({ success: false, error: 'Video file could not be accessed on the server.' });
      return;
    }

    // Parse destination targets
    let destinationIds: string[] = [];
    let directDestinations: any[] = [];
    try {
      if (req.body.destinationIds) {
        destinationIds = typeof req.body.destinationIds === 'string'
          ? JSON.parse(req.body.destinationIds)
          : req.body.destinationIds;
      }
      if (req.body.directDestinations) {
        directDestinations = typeof req.body.directDestinations === 'string'
          ? JSON.parse(req.body.directDestinations)
          : req.body.directDestinations;
      }
    } catch {
      // fallback
    }

    const { studioId: sId, workspaceId: wsId } = await resolveStudioAndWorkspace(req, studioId, workspaceId);

    // Create Broadcast Record in Database
    const broadcast = await prisma.broadcast.create({
      data: {
        title,
        studioId: sId,
        workspaceId: wsId,
        status: 'SCHEDULED',
        scheduledAt: schedDate,
        settings: {
          isPrerecorded: true,
          videoFilePath,
          fileName,
          durationSeconds: duration,
          destinationIds,
          directDestinations,
        },
      },
    });

    // Arm Scheduler Engine
    const streamer = PrerecordedStreamerService.getInstance();
    const result = await streamer.scheduleBroadcast({
      broadcastId: broadcast.id,
      title,
      workspaceId: wsId,
      videoFilePath,
      durationSeconds: duration,
      scheduledAt: schedDate,
      destinationIds,
      directDestinations,
    });

    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    res.status(201).json({
      success: true,
      data: {
        id: broadcast.id,
        title: broadcast.title,
        status: broadcast.status,
        scheduledAt: broadcast.scheduledAt,
        durationSeconds: duration,
        fileName,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/broadcasts/scheduled (List scheduled broadcasts for current workspace)
router.get('/scheduled', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const wsId = (req.headers['x-workspace-id'] as string) || undefined;
    const broadcasts = await prisma.broadcast.findMany({
      where: {
        status: { in: ['SCHEDULED', 'LIVE'] },
        ...(wsId ? { workspaceId: wsId } : {}),
      },
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

// DELETE /api/broadcasts/scheduled/:id (Cancel scheduled broadcast and delete video from VPS immediately)
router.delete('/scheduled/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const streamer = PrerecordedStreamerService.getInstance();
    const canceled = await streamer.cancelScheduledBroadcast(req.params.id);

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
    await prisma.broadcast.delete({
      where: { id: req.params.broadcastId },
    });
    res.status(200).json({ success: true, data: { id: req.params.broadcastId, deleted: true } });
  } catch (error) {
    next(error);
  }
});

export default router;

