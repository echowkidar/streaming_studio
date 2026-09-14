import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as bcrypt from 'bcryptjs';
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

const AddMemberSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  name: z.string().optional(),
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

// GET /api/workspaces/members
router.get('/members', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let defaultWorkspace = await prisma.workspace.findFirst({
      where: { slug: 'default' },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!defaultWorkspace) {
      defaultWorkspace = await prisma.workspace.findFirst({
        include: {
          owner: { select: { id: true, name: true, email: true } },
          members: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
            orderBy: { joinedAt: 'asc' },
          },
        },
      });
    }

    const membersList: Array<{
      id: string;
      userId: string;
      name: string;
      email: string;
      role: string;
      joinedAt: string;
    }> = [];

    if (defaultWorkspace?.owner) {
      membersList.push({
        id: `owner-${defaultWorkspace.owner.id}`,
        userId: defaultWorkspace.owner.id,
        name: defaultWorkspace.owner.name || 'Owner',
        email: defaultWorkspace.owner.email,
        role: 'OWNER',
        joinedAt: defaultWorkspace.createdAt.toISOString(),
      });
    }

    if (defaultWorkspace?.members) {
      for (const m of defaultWorkspace.members) {
        if (m.userId === defaultWorkspace.ownerId) continue;
        membersList.push({
          id: m.id,
          userId: m.userId,
          name: m.user.name || m.user.email.split('@')[0],
          email: m.user.email,
          role: m.role,
          joinedAt: m.joinedAt.toISOString(),
        });
      }
    }

    const allUsers = await prisma.user.findMany({
      select: { id: true, name: true, email: true, createdAt: true },
    });
    for (const u of allUsers) {
      if (!membersList.some((m) => m.userId === u.id || m.email === u.email)) {
        membersList.push({
          id: `usr-${u.id}`,
          userId: u.id,
          name: u.name || u.email.split('@')[0],
          email: u.email,
          role: 'CREATOR',
          joinedAt: u.createdAt.toISOString(),
        });
      }
    }

    res.status(200).json({ success: true, data: membersList });
  } catch (error) {
    next(error);
  }
});

// POST /api/workspaces/members
router.post('/members', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, name, role } = AddMemberSchema.parse(req.body);
    const emailNorm = email.toLowerCase().trim();

    let workspace = await prisma.workspace.findFirst({ where: { slug: 'default' } });
    if (!workspace) {
      workspace = await prisma.workspace.findFirst();
    }
    if (!workspace) {
      res.status(400).json({ success: false, error: 'No workspace found' });
      return;
    }

    let user = await prisma.user.findUnique({ where: { email: emailNorm } });
    if (!user) {
      const defaultHash = await bcrypt.hash('MemberPassword123!', 10);
      user = await prisma.user.create({
        data: {
          email: emailNorm,
          name: name?.trim() || emailNorm.split('@')[0],
          passwordHash: defaultHash,
          role: role === 'ADMIN' ? 'SUPER_ADMIN' : 'USER',
        },
      });
    }

    const existingMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: user.id,
        },
      },
    });

    if (existingMember) {
      const updated = await prisma.workspaceMember.update({
        where: { id: existingMember.id },
        data: { role },
      });
      res.status(200).json({
        success: true,
        message: 'Member role updated',
        data: {
          id: updated.id,
          userId: user.id,
          name: user.name,
          email: user.email,
          role: updated.role,
        },
      });
      return;
    }

    const newMember = await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        role,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Member added successfully',
      data: {
        id: newMember.id,
        userId: user.id,
        name: user.name,
        email: user.email,
        role: newMember.role,
        joinedAt: newMember.joinedAt.toISOString(),
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

// DELETE /api/workspaces/members/:memberId
router.delete('/members/:memberId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { memberId } = req.params;
    if (memberId.startsWith('usr-')) {
      const userId = memberId.replace('usr-', '');
      await prisma.user.delete({ where: { id: userId } }).catch(() => null);
    } else if (!memberId.startsWith('owner-')) {
      await prisma.workspaceMember.delete({ where: { id: memberId } }).catch(() => null);
    }
    res.status(200).json({ success: true, message: 'Member removed successfully' });
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
