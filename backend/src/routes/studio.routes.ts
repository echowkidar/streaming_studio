import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { HttpError, cleanStudioId, getAccessibleStudio, getUserWorkspaceIds, resolveWorkspaceId } from '../lib/access';

// Mounted behind requireAuth in server.ts
const router = Router({ mergeParams: true });

/** Keys inside Studio.settings that only the server may write. */
const SERVER_OWNED_SETTINGS = ['inviteToken', 'inviteTokenUpdatedAt'];

const StudioSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/, 'Invalid studio id').optional(),
  name: z.string().min(1, 'Studio name is required'),
  description: z.string().optional(),
  defaultLayout: z.string().default('solo'),
  workspaceId: z.string().optional(),
  settings: z.record(z.unknown()).optional().default({}),
});

const UpdateStudioSchema = StudioSchema.partial();

function mergeSettings(existing: unknown, incoming: Record<string, unknown>): Record<string, unknown> {
  const current = (existing as Record<string, unknown>) || {};
  const next: Record<string, unknown> = { ...incoming };
  for (const key of SERVER_OWNED_SETTINGS) {
    delete next[key];
    if (current[key] !== undefined) next[key] = current[key];
  }
  return next;
}

function publicStudio<T extends { settings: unknown }>(studio: T): T {
  const settings = { ...((studio.settings as Record<string, unknown>) || {}) };
  return { ...studio, settings };
}

// POST /api/studios
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = StudioSchema.parse(req.body);
    const workspaceId = await resolveWorkspaceId(req);

    if (data.id) {
      const existing = await prisma.studio.findUnique({ where: { id: data.id } });
      if (existing) {
        await getAccessibleStudio(req, data.id); // throws if not ours
        const updated = await prisma.studio.update({
          where: { id: data.id },
          data: {
            name: data.name,
            description: data.description,
            defaultLayout: data.defaultLayout,
            settings: mergeSettings(existing.settings, data.settings) as any,
          },
        });
        res.status(200).json({ success: true, data: publicStudio(updated) });
        return;
      }
    }

    const studio = await prisma.studio.create({
      data: {
        ...(data.id ? { id: data.id } : {}),
        workspaceId,
        name: data.name,
        description: data.description,
        defaultLayout: data.defaultLayout,
        settings: mergeSettings({}, data.settings) as any,
      },
    });
    res.status(201).json({ success: true, data: publicStudio(studio) });
  } catch (error) {
    next(error);
  }
});

// GET /api/studios  (all studios in the caller's workspaces)
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ids = await getUserWorkspaceIds(req.user!.id);
    if (ids.length === 0) ids.push(await resolveWorkspaceId(req));
    const studios = await prisma.studio.findMany({
      where: { workspaceId: { in: ids } },
      include: { _count: { select: { broadcasts: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json({ success: true, data: studios.map(publicStudio) });
  } catch (error) {
    next(error);
  }
});

// GET /api/studios/:studioId
router.get('/:studioId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const studio = await getAccessibleStudio(req, req.params.studioId);
    const broadcasts = await prisma.broadcast.findMany({
      where: { studioId: studio.id },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json({ success: true, data: { ...publicStudio(studio), broadcasts } });
  } catch (error) {
    next(error);
  }
});

// PUT /api/studios/:studioId  (auto-save of layout/scenes; creates on-demand studios)
router.put('/:studioId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = UpdateStudioSchema.parse(req.body);
    const id = cleanStudioId(req.params.studioId);
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id)) throw new HttpError(400, 'Invalid studio id');

    const studio = await getAccessibleStudio(req, id, { createIfMissing: true, name: data.name || id });
    const updated = await prisma.studio.update({
      where: { id: studio.id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.defaultLayout ? { defaultLayout: data.defaultLayout } : {}),
        ...(data.settings ? { settings: mergeSettings(studio.settings, data.settings) as any } : {}),
      },
    });
    res.status(200).json({ success: true, data: { id: updated.id, updatedAt: updated.updatedAt } });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/studios/:studioId
router.delete('/:studioId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const studio = await getAccessibleStudio(req, req.params.studioId);
    if (await prisma.broadcast.count({ where: { studioId: studio.id, status: 'LIVE' } })) {
      throw new HttpError(409, 'This studio is live right now. End the broadcast first.');
    }
    // Broadcast.studio is onDelete: Restrict. Remove empty broadcasts, but never cascade-delete recordings.
    await prisma.broadcast.deleteMany({ where: { studioId: studio.id, recordings: { none: {} } } });
    if (await prisma.broadcast.count({ where: { studioId: studio.id } })) {
      throw new HttpError(409, 'This studio still has recordings. Delete them from Recordings first.');
    }
    await prisma.studio.delete({ where: { id: studio.id } });
    res.status(200).json({ success: true, data: { id: studio.id, deleted: true } });
  } catch (error) {
    next(error);
  }
});

export default router;
