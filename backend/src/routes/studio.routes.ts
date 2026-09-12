import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const router = Router({ mergeParams: true });

const StudioSchema = z.object({
  name: z.string().min(1, 'Studio name is required'),
  description: z.string().optional(),
  defaultLayout: z.string().default('solo'),
  workspaceId: z.string().optional(),
  settings: z.record(z.unknown()).optional().default({}),
});

const UpdateStudioSchema = StudioSchema.partial();

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

// POST /api/studios
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = StudioSchema.parse(req.body);
    const workspaceId = data.workspaceId || (await resolveWorkspaceId(req));

    const studio = await prisma.studio.create({
      data: {
        workspaceId,
        name: data.name,
        description: data.description,
        defaultLayout: data.defaultLayout,
        settings: data.settings as any,
      },
    });

    res.status(201).json({ success: true, data: studio });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors[0]?.message || 'Validation failed' });
      return;
    }
    next(error);
  }
});

// GET /api/studios
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const studios = await prisma.studio.findMany({
      where: { workspaceId },
      include: {
        _count: {
          select: { broadcasts: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ success: true, data: studios });
  } catch (error) {
    next(error);
  }
});

// GET /api/studios/:studioId
router.get('/:studioId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const studio = await prisma.studio.findUnique({
      where: { id: req.params.studioId },
      include: {
        broadcasts: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!studio) {
      res.status(404).json({ success: false, error: 'Studio not found' });
      return;
    }

    res.status(200).json({ success: true, data: studio });
  } catch (error) {
    next(error);
  }
});

// PUT /api/studios/:studioId
router.put('/:studioId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = UpdateStudioSchema.parse(req.body);
    const updated = await prisma.studio.update({
      where: { id: req.params.studioId },
      data: {
        name: data.name,
        description: data.description,
        defaultLayout: data.defaultLayout,
        settings: data.settings ? (data.settings as any) : undefined,
      },
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

// DELETE /api/studios/:studioId
router.delete('/:studioId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.studio.delete({
      where: { id: req.params.studioId },
    });

    res.status(200).json({ success: true, data: { id: req.params.studioId, deleted: true } });
  } catch (error) {
    next(error);
  }
});

export default router;
