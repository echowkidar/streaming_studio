import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { BroadcastStatus } from '@prisma/client';

const router = Router({ mergeParams: true });

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
    
    // Resolve RTMP URLs (handles decryption of stored stream keys)
    const { RtmpStreamerService } = await import('../services/rtmp-streamer.service');
    const streamer = RtmpStreamerService.getInstance();
    const rtmpUrls = await streamer.resolveDestinationUrls(destinationIds || [], directDestinations);
    
    if (rtmpUrls.length === 0) {
      res.status(400).json({ success: false, error: 'No valid RTMP destinations found' });
      return;
    }

    // Start LiveKit Egress
    const { EgressService } = await import('../services/egress.service');
    const egress = EgressService.getInstance();
    const actualRoomName = roomName || `studio-${req.params.broadcastId}`;
    
    const result = await egress.startRoomCompositeEgress(actualRoomName, rtmpUrls);
    
    // Track in memory
    egress.setEgressForBroadcast(req.params.broadcastId, result.egressId);

    // Store egressId in broadcast DB (non-blocking if record doesn't exist yet)
    await prisma.broadcast.update({
      where: { id: req.params.broadcastId },
      data: {
        status: 'LIVE',
        startedAt: new Date(),
        settings: {
          egressId: result.egressId,
          rtmpUrls,
        },
      },
    }).catch((dbErr) => {
      console.warn(`[Broadcast DB] Could not update broadcast ${req.params.broadcastId} status in DB:`, dbErr?.message);
    });

    res.status(200).json({ success: true, egressId: result.egressId, activeDestinations: rtmpUrls.length });
  } catch (error) {
    console.error(`[Broadcast API] /stream/start error:`, error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to start RTMP egress stream' 
    });
  }
});

// POST /api/broadcasts/:broadcastId/stream/stop
router.post('/:broadcastId/stream/stop', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const broadcast = await prisma.broadcast.findUnique({
      where: { id: req.params.broadcastId },
    }).catch(() => null);
    
    const settings = (broadcast?.settings as Record<string, unknown>) || {};
    const { EgressService } = await import('../services/egress.service');
    const egress = EgressService.getInstance();
    const egressId = (settings.egressId as string) || egress.getEgressForBroadcast(req.params.broadcastId);
    
    if (egressId) {
      await egress.stopEgress(egressId).catch((err) => {
        console.warn(`[Egress] Error stopping egress ${egressId}:`, err?.message);
      });
      egress.removeEgressForBroadcast(req.params.broadcastId);
    }
    
    await prisma.broadcast.update({
      where: { id: req.params.broadcastId },
      data: { status: 'ENDED', endedAt: new Date() },
    }).catch(() => null);
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error(`[Broadcast API] /stream/stop error:`, error);
    res.status(200).json({ success: true }); // Always return success on stop to prevent UI lockup
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

