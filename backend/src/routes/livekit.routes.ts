import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { LiveKitService } from '../services/livekit.service';
import { prisma } from '../lib/prisma';

const router = Router();
const livekitService = new LiveKitService();

const TokenRequestSchema = z.object({
  roomName: z.string().min(1),
  participantName: z.string().min(1),
  identity: z.string().optional(),
  role: z.enum(['HOST', 'GUEST', 'CO_HOST']).default('GUEST'),
  inviteToken: z.string().optional(),
});

// GET /api/livekit/invite-status?roomName=...&token=...
router.get('/invite-status', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const roomName = (req.query.roomName as string) || '';
    const tokenQuery = (req.query.token as string) || '';
    const cleanBroadcastId = roomName.replace(/^studio-/, '').replace(/^guest-invite-token-/, '');

    // 1. Check broadcast record in DB
    let broadcast: any = null;
    if (cleanBroadcastId) {
      try {
        broadcast = await prisma.broadcast.findUnique({
          where: { id: cleanBroadcastId },
          select: { id: true, title: true, status: true, settings: true },
        });
      } catch {
        // broadcast lookup fallback
      }
    }

    if (broadcast) {
      // If broadcast has ended or failed -> Link expired!
      if (broadcast.status === 'ENDED' || broadcast.status === 'FAILED') {
        res.status(200).json({
          success: true,
          valid: false,
          reason: 'ENDED',
          message: 'This live broadcast has ended. The guest invite link has expired.',
        });
        return;
      }

      // Check if host revoked/regenerated the invite token
      const settings = (broadcast.settings as Record<string, any>) || {};
      if (settings.inviteToken && tokenQuery && settings.inviteToken !== tokenQuery) {
        res.status(200).json({
          success: true,
          valid: false,
          reason: 'REVOKED',
          message: 'This invite link has been reset or revoked by the host.',
        });
        return;
      }
    }

    // 2. Check if Host is currently present in the LiveKit room
    let hostPresent = false;
    try {
      const participants = await livekitService.getRoomService().listParticipants(roomName);
      hostPresent = participants.some((p) => {
        try {
          const meta = p.metadata ? JSON.parse(p.metadata) : {};
          const r = (meta.role || '').toUpperCase();
          return r === 'HOST' || r === 'CO_HOST' || p.identity.toLowerCase().startsWith('host');
        } catch {
          return p.identity.toLowerCase().startsWith('host');
        }
      });
    } catch {
      hostPresent = false;
    }

    res.status(200).json({
      success: true,
      valid: true,
      broadcastTitle: broadcast?.title || 'Live Studio',
      broadcastStatus: broadcast?.status || 'READY',
      hostPresent,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/livekit/regenerate-invite
router.post('/regenerate-invite', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { broadcastId } = req.body;
    if (!broadcastId) {
      res.status(400).json({ success: false, error: 'broadcastId is required' });
      return;
    }

    const broadcast = await prisma.broadcast.findUnique({
      where: { id: broadcastId },
    });

    if (!broadcast) {
      res.status(404).json({ success: false, error: 'Broadcast not found' });
      return;
    }

    const newToken = `inv-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
    const settings = (broadcast.settings as Record<string, any>) || {};

    await prisma.broadcast.update({
      where: { id: broadcastId },
      data: {
        settings: {
          ...settings,
          inviteToken: newToken,
        },
      },
    });

    res.status(200).json({ success: true, inviteToken: newToken });
  } catch (error) {
    next(error);
  }
});

router.post('/token', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { roomName, participantName, identity, role, inviteToken } = TokenRequestSchema.parse(req.body);

    const cleanBroadcastId = roomName.replace(/^studio-/, '').replace(/^guest-invite-token-/, '');

    // If guest is connecting, verify broadcast is not ENDED
    if (role === 'GUEST' && cleanBroadcastId) {
      try {
        const broadcast = await prisma.broadcast.findUnique({
          where: { id: cleanBroadcastId },
          select: { id: true, status: true, settings: true },
        });

        if (broadcast) {
          if (broadcast.status === 'ENDED' || broadcast.status === 'FAILED') {
            res.status(403).json({
              success: false,
              error: 'This live broadcast has ended. The guest invite link has expired.',
            });
            return;
          }

          const settings = (broadcast.settings as Record<string, any>) || {};
          if (settings.inviteToken && inviteToken && settings.inviteToken !== inviteToken) {
            res.status(403).json({
              success: false,
              error: 'This invite link has been reset or revoked by the host.',
            });
            return;
          }
        }
      } catch {
        // non-fatal
      }
    }

    const participantId = identity || `${role.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const isHost = role === 'HOST';

    const tokenResult = await livekitService.generateToken(
      roomName,
      {
        identity: participantId,
        name: participantName,
        metadata: JSON.stringify({ role, participantName }),
      },
      isHost
    );

    if (!tokenResult.success) {
      res.status(500).json({ success: false, error: tokenResult.error });
      return;
    }

    const rawHost = process.env.LIVEKIT_URL || process.env.LIVEKIT_WS_URL || '';
    const serverUrl = rawHost
      ? rawHost.replace(/^http:\/\//i, 'ws://').replace(/^https:\/\//i, 'wss://')
      : undefined;

    res.status(200).json({
      success: true,
      data: {
        token: tokenResult.data,
        serverUrl,
        roomName,
        identity: participantId,
        participantName,
        role,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors[0]?.message || 'Invalid request' });
      return;
    }
    next(error);
  }
});

export default router;
