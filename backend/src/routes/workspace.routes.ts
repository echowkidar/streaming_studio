import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const router = Router();

const WorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required'),
  slug: z.string().min(2, 'Slug must be at least 2 characters').regex(/^[a-z0-9-]+$/, 'Invalid slug format'),
  logoUrl: z.string().optional(),
});

const UpdateWorkspaceSchema = WorkspaceSchema.partial();

const MemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['OWNER', 'ADMIN', 'PRODUCER', 'CREATOR']).default('CREATOR'),
});

// POST /api/workspaces
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = WorkspaceSchema.parse(req.body);

    // Resolve or create a default owner
    let owner = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
    if (!owner) {
      owner = await prisma.user.create({
        data: {
          email: 'admin@livestudio.io',
          passwordHash: 'seeded',
          name: 'Super Admin',
          role: 'SUPER_ADMIN',
        },
      });
    }

    const workspace = await prisma.workspace.create({
      data: {
        name: data.name,
        slug: data.slug,
        logoUrl: data.logoUrl,
        ownerId: owner.id,
      },
    });

    res.status(201).json({ success: true, data: workspace });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors[0]?.message || 'Validation failed' });
      return;
    }
    next(error);
  }
});

// GET /api/workspaces
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const workspaces = await prisma.workspace.findMany({
      include: {
        _count: {
          select: { members: true, studios: true, broadcasts: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.status(200).json({ success: true, data: workspaces });
  } catch (error) {
    next(error);
  }
});

// GET /api/workspaces/:workspaceId
router.get('/:workspaceId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const workspace = await prisma.workspace.findFirst({
      where: {
        OR: [{ id: req.params.workspaceId }, { slug: req.params.workspaceId }],
      },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
        studios: true,
        destinations: true,
      },
    });

    if (!workspace) {
      res.status(404).json({ success: false, error: 'Workspace not found' });
      return;
    }

    res.status(200).json({ success: true, data: workspace });
  } catch (error) {
    next(error);
  }
});

// PUT /api/workspaces/:workspaceId
router.put('/:workspaceId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = UpdateWorkspaceSchema.parse(req.body);
    const updated = await prisma.workspace.update({
      where: { id: req.params.workspaceId },
      data,
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

// DELETE /api/workspaces/:workspaceId
router.delete('/:workspaceId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.workspace.delete({
      where: { id: req.params.workspaceId },
    });
    res.status(200).json({ success: true, data: { id: req.params.workspaceId, deleted: true } });
  } catch (error) {
    next(error);
  }
});

export default router;
