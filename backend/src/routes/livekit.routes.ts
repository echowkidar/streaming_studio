import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { LiveKitService } from '../services/livekit.service';

const router = Router();
const livekitService = new LiveKitService();

const TokenRequestSchema = z.object({
  roomName: z.string().min(1),
  participantName: z.string().min(1),
  identity: z.string().optional(),
  role: z.enum(['HOST', 'GUEST', 'CO_HOST']).default('GUEST'),
});

router.post('/token', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { roomName, participantName, identity, role } = TokenRequestSchema.parse(req.body);

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

    res.status(200).json({
      success: true,
      data: {
        token: tokenResult.data,
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
