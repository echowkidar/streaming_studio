import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { LiveKitService } from '../services/livekit.service';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { HttpError, cleanStudioId, getAccessibleStudio } from '../lib/access';

const router = Router();
const livekitService = new LiveKitService();

const ROOM_NAME = z.string().regex(/^studio-[a-zA-Z0-9_-]{1,64}$/, 'Invalid room name');

const TokenRequestSchema = z.object({
  roomName: ROOM_NAME,
  participantName: z.string().trim().min(1).max(60),
  role: z.enum(['HOST', 'GUEST', 'CO_HOST']).default('GUEST'),
  inviteToken: z.string().max(200).optional(),
});

function newInviteToken(): string {
  return `inv-${crypto.randomBytes(18).toString('base64url')}`;
}

function tokensMatch(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

async function setStudioInviteToken(studioId: string, token: string): Promise<void> {
  const studio = await prisma.studio.findUnique({ where: { id: studioId }, select: { settings: true } });
  const settings = (studio?.settings as Record<string, unknown>) || {};
  await prisma.studio.update({
    where: { id: studioId },
    data: { settings: { ...settings, inviteToken: token, inviteTokenUpdatedAt: new Date().toISOString() } as any },
  });
}

async function getStudioInviteToken(studioId: string): Promise<string | undefined> {
  const studio = await prisma.studio.findUnique({ where: { id: studioId }, select: { settings: true } });
  const token = ((studio?.settings as Record<string, unknown>) || {}).inviteToken;
  return typeof token === 'string' && token ? token : undefined;
}

// GET /api/livekit/invite?roomName=studio-xyz   (host: current invite token, created on first use)
router.get('/invite', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const roomName = ROOM_NAME.parse(String(req.query.roomName || ''));
    const studio = await getAccessibleStudio(req, roomName, { createIfMissing: true });
    let token = await getStudioInviteToken(studio.id);
    if (!token) {
      token = newInviteToken();
      await setStudioInviteToken(studio.id, token);
    }
    res.status(200).json({ success: true, inviteToken: token });
  } catch (error) {
    next(error);
  }
});

// POST /api/livekit/regenerate-invite   (host: revoke old link, issue a new one)
router.post('/regenerate-invite', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const raw = String(req.body?.roomName || req.body?.broadcastId || '');
    const studio = await getAccessibleStudio(req, raw, { createIfMissing: true });
    const token = newInviteToken();
    await setStudioInviteToken(studio.id, token);
    res.status(200).json({ success: true, inviteToken: token });
  } catch (error) {
    next(error);
  }
});

// GET /api/livekit/invite-status?roomName=...&token=...   (public: used by the guest join page)
router.get('/invite-status', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const roomName = String(req.query.roomName || '');
    const tokenQuery = String(req.query.token || '');
    if (!tokenQuery) {
      res.status(200).json({
        success: true,
        valid: false,
        reason: 'MISSING_TOKEN',
        message: 'This invite link is missing a security token or has expired. Please ask the host for a new link.',
      });
      return;
    }

    const studioId = cleanStudioId(roomName);
    const studio = /^[a-zA-Z0-9_-]{1,64}$/.test(studioId)
      ? await prisma.studio.findUnique({ where: { id: studioId } })
      : null;
    const current = studio ? await getStudioInviteToken(studio.id) : undefined;
    if (!studio || !tokensMatch(current, tokenQuery)) {
      res.status(200).json({
        success: true,
        valid: false,
        reason: 'REVOKED',
        message: 'This invite link has been reset or revoked by the host. Please ask the host for the latest link.',
      });
      return;
    }

    let hostPresent = false;
    try {
      const participants = await livekitService.getRoomService().listParticipants(`studio-${studio.id}`);
      hostPresent = participants.some((p) => {
        try {
          const role = String(JSON.parse(p.metadata || '{}').role || '').toUpperCase();
          return role === 'HOST' || role === 'CO_HOST';
        } catch {
          return false;
        }
      });
    } catch {
      hostPresent = false;
    }

    res.status(200).json({
      success: true,
      valid: true,
      broadcastTitle: studio.name || 'Live Studio',
      broadcastStatus: 'READY',
      hostPresent,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/livekit/token
router.post('/token', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { roomName, participantName, role, inviteToken } = TokenRequestSchema.parse(req.body);
    const studioId = cleanStudioId(roomName);
    let identity: string;

    if (role === 'HOST' || role === 'CO_HOST') {
      if (!req.user) throw new HttpError(401, 'Please log in to join as host');
      const studio = await getAccessibleStudio(req, studioId, { createIfMissing: true });
      // Identity is decided by the server, so nobody can impersonate (and kick) the host.
      identity = role === 'HOST' ? `host-${req.user.id}` : `cohost-${req.user.id}`;
      if (studio.id !== studioId) throw new HttpError(400, 'Invalid studio');
    } else {
      const studio = await prisma.studio.findUnique({ where: { id: studioId } });
      const current = studio ? await getStudioInviteToken(studio.id) : undefined;
      if (!inviteToken) {
        throw new HttpError(403, 'An invite security token is required to join this studio as a guest.');
      }
      if (!studio || !tokensMatch(current, inviteToken)) {
        throw new HttpError(403, 'This invite link has expired or was reset by the host.');
      }
      identity = `guest-${crypto.randomBytes(6).toString('hex')}`;
    }

    const tokenResult = await livekitService.generateToken(
      roomName,
      {
        identity,
        name: participantName,
        metadata: JSON.stringify({ role, participantName }),
      },
      role === 'HOST'
    );
    if (!tokenResult.success) throw new HttpError(500, tokenResult.error);

    const rawHost = process.env.LIVEKIT_URL || process.env.LIVEKIT_WS_URL || '';
    const serverUrl = rawHost
      ? rawHost.replace(/^http:\/\//i, 'ws://').replace(/^https:\/\//i, 'wss://')
      : undefined;

    res.status(200).json({
      success: true,
      data: { token: tokenResult.data, serverUrl, roomName, identity, participantName, role },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
