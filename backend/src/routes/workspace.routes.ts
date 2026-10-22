import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { HttpError, assertWorkspaceAccess, getUserWorkspaceIds, resolveWorkspaceId } from '../lib/access';

// Mounted behind requireAuth in server.ts
const router = Router();

const WorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required'),
  slug: z.string().min(2, 'Slug must be at least 2 characters').regex(/^[a-z0-9-]+$/, 'Invalid slug format'),
  logoUrl: z.string().optional(),
});

const UpdateWorkspaceSchema = WorkspaceSchema.partial();

const AddMemberSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  name: z.string().optional(),
  role: z.enum(['ADMIN', 'PRODUCER', 'CREATOR']).default('CREATOR'),
});

/** Only the workspace owner, a workspace ADMIN or a SUPER_ADMIN may manage it. */
async function assertCanManage(req: Request, workspaceId: string): Promise<void> {
  if (req.user!.role === 'SUPER_ADMIN') return;
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { ownerId: true } });
  if (!ws) throw new HttpError(404, 'Workspace not found');
  if (ws.ownerId === req.user!.id) return;
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: req.user!.id } },
  });
  if (member && (member.role === 'OWNER' || member.role === 'ADMIN')) return;
  throw new HttpError(403, 'Only the workspace owner or an admin can do this');
}

// POST /api/workspaces
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = WorkspaceSchema.parse(req.body);
    const workspace = await prisma.workspace.create({
      data: {
        name: data.name,
        slug: data.slug,
        logoUrl: data.logoUrl,
        ownerId: req.user!.id,
        members: { create: { userId: req.user!.id, role: 'OWNER' } },
      },
    });
    res.status(201).json({ success: true, data: workspace });
  } catch (error) {
    next(error);
  }
});

// GET /api/workspaces  (only the caller's workspaces)
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ids = await getUserWorkspaceIds(req.user!.id);
    const workspaces = await prisma.workspace.findMany({
      where: { id: { in: ids } },
      include: { _count: { select: { members: true, studios: true, broadcasts: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.status(200).json({ success: true, data: workspaces });
  } catch (error) {
    next(error);
  }
});

// GET /api/workspaces/members  (members of the caller's current workspace)
router.get('/members', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });
    if (!workspace) throw new HttpError(404, 'Workspace not found');

    const membersList: Array<{ id: string; userId: string; name: string; email: string; role: string; joinedAt: string }> = [];
    membersList.push({
      id: `owner-${workspace.owner.id}`,
      userId: workspace.owner.id,
      name: workspace.owner.name || 'Owner',
      email: workspace.owner.email,
      role: 'OWNER',
      joinedAt: workspace.createdAt.toISOString(),
    });
    for (const m of workspace.members) {
      if (m.userId === workspace.ownerId) continue;
      membersList.push({
        id: m.id,
        userId: m.userId,
        name: m.user.name || m.user.email.split('@')[0],
        email: m.user.email,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
      });
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
    const workspaceId = await resolveWorkspaceId(req);
    await assertCanManage(req, workspaceId);

    let tempPassword: string | undefined;
    let user = await prisma.user.findUnique({ where: { email: emailNorm } });
    if (!user) {
      // New account: random one-time password returned to the inviter (never a shared default).
      tempPassword = crypto.randomBytes(9).toString('base64url');
      user = await prisma.user.create({
        data: {
          email: emailNorm,
          name: name?.trim() || emailNorm.split('@')[0],
          passwordHash: await bcrypt.hash(tempPassword, 12),
          role: 'USER', // workspace roles never grant global SUPER_ADMIN
        },
      });
    }

    const existingMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: user.id } },
    });

    const member = existingMember
      ? await prisma.workspaceMember.update({ where: { id: existingMember.id }, data: { role } })
      : await prisma.workspaceMember.create({ data: { workspaceId, userId: user.id, role } });

    res.status(existingMember ? 200 : 201).json({
      success: true,
      message: existingMember ? 'Member role updated' : 'Member added successfully',
      data: {
        id: member.id,
        userId: user.id,
        name: user.name,
        email: user.email,
        role: member.role,
        joinedAt: member.joinedAt.toISOString(),
        ...(tempPassword ? { tempPassword } : {}),
      },
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/workspaces/members/:memberId  (removes membership only — never deletes the user account)
router.delete('/members/:memberId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { memberId } = req.params;
    if (memberId.startsWith('owner-')) throw new HttpError(400, 'The workspace owner cannot be removed');
    const member = await prisma.workspaceMember.findUnique({ where: { id: memberId } });
    if (!member) throw new HttpError(404, 'Member not found');
    await assertCanManage(req, member.workspaceId);
    await prisma.workspaceMember.delete({ where: { id: memberId } });
    res.status(200).json({ success: true, message: 'Member removed successfully' });
  } catch (error) {
    next(error);
  }
});

// GET /api/workspaces/:workspaceId
router.get('/:workspaceId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const workspace = await prisma.workspace.findFirst({
      where: { OR: [{ id: req.params.workspaceId }, { slug: req.params.workspaceId }] },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
        studios: true,
        destinations: {
          select: { id: true, name: true, platform: true, rtmpUrl: true, status: true, lastUsedAt: true, createdAt: true },
        },
      },
    });
    if (!workspace) throw new HttpError(404, 'Workspace not found');
    await assertWorkspaceAccess(req, workspace.id);
    res.status(200).json({ success: true, data: workspace });
  } catch (error) {
    next(error);
  }
});

// PUT /api/workspaces/:workspaceId
router.put('/:workspaceId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = UpdateWorkspaceSchema.parse(req.body);
    await assertCanManage(req, req.params.workspaceId);
    const updated = await prisma.workspace.update({ where: { id: req.params.workspaceId }, data });
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/workspaces/:workspaceId  (owner or super admin only)
router.delete('/:workspaceId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ws = await prisma.workspace.findUnique({ where: { id: req.params.workspaceId } });
    if (!ws) throw new HttpError(404, 'Workspace not found');
    if (ws.ownerId !== req.user!.id && req.user!.role !== 'SUPER_ADMIN') {
      throw new HttpError(403, 'Only the owner can delete a workspace');
    }
    await prisma.workspace.delete({ where: { id: ws.id } });
    res.status(200).json({ success: true, data: { id: ws.id, deleted: true } });
  } catch (error) {
    next(error);
  }
});

export default router;
