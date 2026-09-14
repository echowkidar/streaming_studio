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

// Fast in-memory active invite token registry for rooms (supports both on-demand and scheduled broadcasts)
const roomInviteTokens = new Map<string, { token: string; createdAt: number }>();

// GET /api/livekit/invite-status?roomName=...&token=...
router.get('/invite-status', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const roomName = (req.query.roomName as string) || '';
    const tokenQuery = (req.query.token as string) || '';
    const cleanBroadcastId = roomName.replace(/^studio-/, '').replace(/^guest-invite-token-/, '');

    // 1. Mandatory Token Check: Plain links without token parameter are rejected
    if (!tokenQuery) {
      res.status(200).json({
        success: true,
        valid: false,
        reason: 'MISSING_TOKEN',
        message: 'This invite link is missing a security token or has expired. Please ask the host for a new link.',
      });
      return;
    }

    // 2. Check active invite token in memory registry
    const registered = roomInviteTokens.get(roomName) || roomInviteTokens.get(cleanBroadcastId);
    if (registered && registered.token !== tokenQuery) {
      res.status(200).json({
        success: true,
        valid: false,
        reason: 'REVOKED',
        message: 'This invite link has been reset or revoked by the host. Please ask the host for the latest link.',
      });
      return;
    }

    // 3. Check broadcast record in DB if exists
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
      if (settings.inviteToken && settings.inviteToken !== tokenQuery) {
        res.status(200).json({
          success: true,
          valid: false,
          reason: 'REVOKED',
          message: 'This invite link has been reset or revoked by the host.',
        });
        return;
      }
    }

    // 4. Check if Host is currently present in the LiveKit room
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

    // Register active token for this on-demand room if not already registered
    if (!registered) {
      roomInviteTokens.set(roomName, { token: tokenQuery, createdAt: Date.now() });
      roomInviteTokens.set(cleanBroadcastId, { token: tokenQuery, createdAt: Date.now() });
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
    const { broadcastId, roomName, forceToken } = req.body;
    const effectiveRoom = (roomName || (broadcastId ? (broadcastId.startsWith('studio-') ? broadcastId : `studio-${broadcastId}`) : '')).trim();

    if (!effectiveRoom) {
      res.status(400).json({ success: false, error: 'broadcastId or roomName is required' });
      return;
    }

    const cleanId = effectiveRoom.replace(/^studio-/, '');
    const newToken = forceToken || `inv-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;

    // Store in room registry
    roomInviteTokens.set(effectiveRoom, { token: newToken, createdAt: Date.now() });
    roomInviteTokens.set(cleanId, { token: newToken, createdAt: Date.now() });

    // Also update broadcast in database if exists
    try {
      const broadcast = await prisma.broadcast.findUnique({
        where: { id: cleanId },
      });

      if (broadcast) {
        const settings = (broadcast.settings as Record<string, any>) || {};
        await prisma.broadcast.update({
          where: { id: cleanId },
          data: {
            settings: {
              ...settings,
              inviteToken: newToken,
            },
          },
        });
      }
    } catch {
      // non-fatal if room is an on-demand session
    }

    res.status(200).json({ success: true, inviteToken: newToken });
  } catch (error) {
    next(error);
  }
});

router.post('/token', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { roomName, participantName, identity, role, inviteToken } = TokenRequestSchema.parse(req.body);

    const cleanBroadcastId = roomName.replace(/^studio-/, '').replace(/^guest-invite-token-/, '');

    // If guest is connecting, enforce valid invite token
    if (role === 'GUEST') {
      if (!inviteToken) {
        res.status(403).json({
          success: false,
          error: 'An invite security token is required to join this studio as a guest.',
        });
        return;
      }

      const registered = roomInviteTokens.get(roomName) || roomInviteTokens.get(cleanBroadcastId);
      if (registered && registered.token !== inviteToken) {
        res.status(403).json({
          success: false,
          error: 'This invite link has expired or was reset by the host.',
        });
        return;
      }

      if (cleanBroadcastId) {
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
            if (settings.inviteToken && settings.inviteToken !== inviteToken) {
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
