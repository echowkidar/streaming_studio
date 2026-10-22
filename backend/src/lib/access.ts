import { Request } from 'express';
import { prisma } from './prisma';

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** All workspace ids the user owns or is a member of. */
export async function getUserWorkspaceIds(userId: string): Promise<string[]> {
  const [owned, memberships] = await Promise.all([
    prisma.workspace.findMany({ where: { ownerId: userId }, select: { id: true } }),
    prisma.workspaceMember.findMany({ where: { userId }, select: { workspaceId: true } }),
  ]);
  return Array.from(new Set([...owned.map((w) => w.id), ...memberships.map((m) => m.workspaceId)]));
}

export async function canAccessWorkspace(req: Request, workspaceId: string | null | undefined): Promise<boolean> {
  if (!req.user || !workspaceId) return false;
  if (req.user.role === 'SUPER_ADMIN') return true;
  const ids = await getUserWorkspaceIds(req.user.id);
  return ids.includes(workspaceId);
}

export async function assertWorkspaceAccess(req: Request, workspaceId: string | null | undefined): Promise<void> {
  if (!(await canAccessWorkspace(req, workspaceId))) {
    throw new HttpError(404, 'Not found');
  }
}

/**
 * The workspace this request acts on. An explicit x-workspace-id / body.workspaceId is honoured
 * only when the user actually belongs to it; otherwise the user's personal workspace is used
 * (created on first use). Never falls back to someone else's workspace.
 */
export async function resolveWorkspaceId(req: Request): Promise<string> {
  if (!req.user) throw new HttpError(401, 'Unauthorized: please log in again');

  const requested =
    (req.headers['x-workspace-id'] as string | undefined) ||
    (typeof req.body?.workspaceId === 'string' ? req.body.workspaceId : undefined);
  if (requested && requested !== 'default' && (await canAccessWorkspace(req, requested))) {
    const exists = await prisma.workspace.findUnique({ where: { id: requested }, select: { id: true } });
    if (exists) return exists.id;
  }

  const owned = await prisma.workspace.findFirst({
    where: { ownerId: req.user.id },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (owned) return owned.id;

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: req.user.id },
    orderBy: { joinedAt: 'asc' },
    select: { workspaceId: true },
  });
  if (membership) return membership.workspaceId;

  const ws = await prisma.workspace.create({
    data: {
      name: `${req.user.name || 'My'}'s Studio`,
      slug: `ws-${req.user.id.toLowerCase().slice(-8)}-${Date.now()}`,
      ownerId: req.user.id,
      members: { create: { userId: req.user.id, role: 'OWNER' } },
    },
  });
  return ws.id;
}

/** Studio ids may arrive as "studio-xyz" (LiveKit room names). */
export function cleanStudioId(raw: string): string {
  return String(raw || '').replace(/^studio-/, '').replace(/^guest-invite-token-/, '');
}

/**
 * Load a studio the user may use. When `createIfMissing` is set and no studio with that id exists,
 * it is created in the user's workspace (on-demand studios such as /studio/my-show).
 */
export async function getAccessibleStudio(
  req: Request,
  rawStudioId: string,
  opts: { createIfMissing?: boolean; name?: string } = {}
) {
  const id = cleanStudioId(rawStudioId);
  if (!id) throw new HttpError(400, 'Studio id is required');

  const studio = await prisma.studio.findUnique({ where: { id } });
  if (studio) {
    await assertWorkspaceAccess(req, studio.workspaceId);
    return studio;
  }
  if (!opts.createIfMissing) throw new HttpError(404, 'Studio not found');

  const workspaceId = await resolveWorkspaceId(req);
  return prisma.studio.create({
    data: { id, workspaceId, name: opts.name || id, description: '' },
  });
}

/**
 * Load a broadcast the user may use. Studio pages use the studio id as broadcast id, so when
 * `createForStudio` is set a broadcast record with that id is created for the studio.
 */
export async function getAccessibleBroadcast(
  req: Request,
  rawBroadcastId: string,
  opts: { createForStudio?: boolean } = {}
) {
  const id = cleanStudioId(rawBroadcastId);
  if (!id) throw new HttpError(400, 'Broadcast id is required');

  const broadcast = await prisma.broadcast.findUnique({ where: { id } });
  if (broadcast) {
    await assertWorkspaceAccess(req, broadcast.workspaceId);
    return broadcast;
  }
  if (!opts.createForStudio) throw new HttpError(404, 'Broadcast not found');

  const studio = await getAccessibleStudio(req, id, { createIfMissing: true });
  return prisma.broadcast.create({
    data: {
      id,
      studioId: studio.id,
      workspaceId: studio.workspaceId,
      title: studio.name || 'Live Broadcast',
      status: 'READY',
    },
  });
}

export function sendError(res: import('express').Response, err: unknown): boolean {
  if (err instanceof HttpError) {
    res.status(err.status).json({ success: false, error: err.message });
    return true;
  }
  return false;
}
