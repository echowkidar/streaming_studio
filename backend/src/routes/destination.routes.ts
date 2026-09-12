import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { EncryptionService } from '../services/encryption.service';
import { DestinationPlatform } from '@prisma/client';

const router = Router({ mergeParams: true });
const encryptionService = new EncryptionService();

const DestinationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  platform: z.enum(['YOUTUBE', 'FACEBOOK', 'TWITCH', 'LINKEDIN', 'CUSTOM_RTMP']),
  rtmpUrl: z.string().min(1, 'RTMP server URL is required'),
  streamKey: z.string().min(1, 'Stream key is required'),
  workspaceId: z.string().optional(),
});

const UpdateDestinationSchema = z.object({
  name: z.string().min(1).optional(),
  platform: z.enum(['YOUTUBE', 'FACEBOOK', 'TWITCH', 'LINKEDIN', 'CUSTOM_RTMP']).optional(),
  rtmpUrl: z.string().min(1).optional(),
  streamKey: z.string().min(1).optional(),
});

// Helper to resolve workspace ID
async function resolveWorkspaceId(req: Request): Promise<string> {
  const reqWsId = (req.headers['x-workspace-id'] as string) || (req.body?.workspaceId as string);
  if (reqWsId) {
    const ws = await prisma.workspace.findUnique({ where: { id: reqWsId } });
    if (ws) return ws.id;
  }
  const defaultWs = await prisma.workspace.findFirst({ orderBy: { createdAt: 'asc' } });
  if (defaultWs) return defaultWs.id;

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
  return newWs.id;
}

// POST /api/destinations
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = DestinationSchema.parse(req.body);
    const workspaceId = data.workspaceId || (await resolveWorkspaceId(req));

    // Encrypt stream key with AES-256-GCM
    const encRes = await encryptionService.encrypt(data.streamKey);
    if (!encRes.success || !encRes.data) {
      res.status(500).json({ success: false, error: 'Encryption failed' });
      return;
    }

    const destination = await prisma.destination.create({
      data: {
        workspaceId,
        name: data.name,
        platform: data.platform as DestinationPlatform,
        rtmpUrl: data.rtmpUrl,
        streamKeyEncrypted: encRes.data.encryptedData,
        streamKeyIv: encRes.data.iv,
        streamKeyTag: encRes.data.authTag,
        status: 'DISCONNECTED',
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: destination.id,
        workspaceId: destination.workspaceId,
        name: destination.name,
        platform: destination.platform,
        rtmpUrl: destination.rtmpUrl,
        streamKey: '••••••••••••',
        status: destination.status,
        lastUsedAt: destination.lastUsedAt,
        createdAt: destination.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors[0]?.message || 'Validation failed' });
      return;
    }
    next(error);
  }
});

// GET /api/destinations
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const destinations = await prisma.destination.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });

    const safeDestinations = destinations.map((d) => ({
      id: d.id,
      workspaceId: d.workspaceId,
      name: d.name,
      platform: d.platform,
      rtmpUrl: d.rtmpUrl,
      streamKey: '••••••••••••',
      status: d.status,
      lastUsedAt: d.lastUsedAt,
      createdAt: d.createdAt,
    }));

    res.status(200).json({ success: true, data: safeDestinations });
  } catch (error) {
    next(error);
  }
});

// GET /api/destinations/:destinationId
router.get('/:destinationId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const destination = await prisma.destination.findUnique({
      where: { id: req.params.destinationId },
    });

    if (!destination) {
      res.status(404).json({ success: false, error: 'Destination not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        id: destination.id,
        workspaceId: destination.workspaceId,
        name: destination.name,
        platform: destination.platform,
        rtmpUrl: destination.rtmpUrl,
        streamKey: '••••••••••••',
        status: destination.status,
        lastUsedAt: destination.lastUsedAt,
        createdAt: destination.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/destinations/:destinationId
router.put('/:destinationId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = UpdateDestinationSchema.parse(req.body);

    const updatePayload: Record<string, unknown> = {};
    if (data.name) updatePayload.name = data.name;
    if (data.platform) updatePayload.platform = data.platform as DestinationPlatform;
    if (data.rtmpUrl) updatePayload.rtmpUrl = data.rtmpUrl;

    if (data.streamKey) {
      const encRes = await encryptionService.encrypt(data.streamKey);
      if (!encRes.success || !encRes.data) {
        res.status(500).json({ success: false, error: 'Encryption failed' });
        return;
      }
      updatePayload.streamKeyEncrypted = encRes.data.encryptedData;
      updatePayload.streamKeyIv = encRes.data.iv;
      updatePayload.streamKeyTag = encRes.data.authTag;
    }

    const updated = await prisma.destination.update({
      where: { id: req.params.destinationId },
      data: updatePayload,
    });

    res.status(200).json({
      success: true,
      data: {
        id: updated.id,
        workspaceId: updated.workspaceId,
        name: updated.name,
        platform: updated.platform,
        rtmpUrl: updated.rtmpUrl,
        streamKey: '••••••••••••',
        status: updated.status,
        lastUsedAt: updated.lastUsedAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors[0]?.message || 'Validation failed' });
      return;
    }
    next(error);
  }
});

// DELETE /api/destinations/:destinationId
router.delete('/:destinationId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.destination.delete({
      where: { id: req.params.destinationId },
    });
    res.status(200).json({ success: true, data: { id: req.params.destinationId, deleted: true } });
  } catch (error) {
    next(error);
  }
});

export default router;
