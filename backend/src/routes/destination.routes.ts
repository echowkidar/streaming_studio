import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { EncryptionService } from '../services/encryption.service';
import { DestinationPlatform } from '@prisma/client';
import { HttpError, assertWorkspaceAccess, getUserWorkspaceIds, resolveWorkspaceId } from '../lib/access';

// Mounted behind requireAuth in server.ts
const router = Router({ mergeParams: true });
const encryptionService = new EncryptionService();

const RTMP_URL = z
  .string()
  .min(1, 'RTMP server URL is required')
  .regex(/^rtmps?:\/\/[^\s]+$/i, 'RTMP URL must start with rtmp:// or rtmps://');

const DestinationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  platform: z.enum(['YOUTUBE', 'FACEBOOK', 'TWITCH', 'LINKEDIN', 'CUSTOM_RTMP']),
  rtmpUrl: RTMP_URL,
  streamKey: z.string().min(1, 'Stream key is required'),
  workspaceId: z.string().optional(),
});

const UpdateDestinationSchema = z.object({
  name: z.string().min(1).optional(),
  platform: z.enum(['YOUTUBE', 'FACEBOOK', 'TWITCH', 'LINKEDIN', 'CUSTOM_RTMP']).optional(),
  rtmpUrl: RTMP_URL.optional(),
  streamKey: z.string().min(1).optional(),
});

function toPublic(d: {
  id: string;
  workspaceId: string;
  name: string;
  platform: DestinationPlatform;
  rtmpUrl: string;
  status: string;
  lastUsedAt?: Date | null;
  createdAt: Date;
}) {
  return {
    id: d.id,
    workspaceId: d.workspaceId,
    name: d.name,
    platform: d.platform,
    rtmpUrl: d.rtmpUrl,
    streamKey: '••••••••••••',
    status: d.status,
    lastUsedAt: d.lastUsedAt,
    createdAt: d.createdAt,
  };
}

async function getOwnedDestination(req: Request, id: string) {
  const destination = await prisma.destination.findUnique({ where: { id } });
  if (!destination) throw new HttpError(404, 'Destination not found');
  await assertWorkspaceAccess(req, destination.workspaceId);
  return destination;
}

// POST /api/destinations
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = DestinationSchema.parse(req.body);
    const workspaceId = await resolveWorkspaceId(req);

    const encRes = await encryptionService.encrypt(data.streamKey.trim());
    if (!encRes.success) throw new HttpError(500, 'Encryption failed');

    const created = await prisma.destination.create({
      data: {
        workspaceId,
        name: data.name,
        platform: data.platform as DestinationPlatform,
        rtmpUrl: data.rtmpUrl.trim(),
        streamKeyEncrypted: encRes.data.encryptedData,
        streamKeyIv: encRes.data.iv,
        streamKeyTag: encRes.data.authTag,
        status: 'DISCONNECTED',
      },
    });
    res.status(201).json({ success: true, data: toPublic(created) });
  } catch (error) {
    next(error);
  }
});

// GET /api/destinations
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ids = await getUserWorkspaceIds(req.user!.id);
    if (ids.length === 0) ids.push(await resolveWorkspaceId(req));
    const destinations = await prisma.destination.findMany({
      where: { workspaceId: { in: ids } },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json({ success: true, data: destinations.map(toPublic) });
  } catch (error) {
    next(error);
  }
});

// GET /api/destinations/:destinationId
router.get('/:destinationId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const destination = await getOwnedDestination(req, req.params.destinationId);
    res.status(200).json({ success: true, data: toPublic(destination) });
  } catch (error) {
    next(error);
  }
});

// PUT /api/destinations/:destinationId
router.put('/:destinationId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = UpdateDestinationSchema.parse(req.body);
    const existing = await getOwnedDestination(req, req.params.destinationId);

    const updatePayload: Record<string, unknown> = {};
    if (data.name) updatePayload.name = data.name;
    if (data.platform) updatePayload.platform = data.platform as DestinationPlatform;
    if (data.rtmpUrl) updatePayload.rtmpUrl = data.rtmpUrl.trim();
    if (data.streamKey && data.streamKey.trim() && !data.streamKey.includes('••••')) {
      const encRes = await encryptionService.encrypt(data.streamKey.trim());
      if (!encRes.success) throw new HttpError(500, 'Encryption failed');
      updatePayload.streamKeyEncrypted = encRes.data.encryptedData;
      updatePayload.streamKeyIv = encRes.data.iv;
      updatePayload.streamKeyTag = encRes.data.authTag;
    }

    const updated = await prisma.destination.update({ where: { id: existing.id }, data: updatePayload });
    res.status(200).json({ success: true, data: toPublic(updated) });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/destinations/:destinationId
router.delete('/:destinationId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const existing = await getOwnedDestination(req, req.params.destinationId);
    await prisma.destination.delete({ where: { id: existing.id } });
    res.status(200).json({ success: true, data: { id: existing.id, deleted: true } });
  } catch (error) {
    next(error);
  }
});

export default router;
