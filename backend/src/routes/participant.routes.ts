import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const router = Router();

const IdParamSchema = z.object({ id: z.string().uuid() });
const InviteSchema = z.object({ email: z.string().email(), role: z.enum(['guest', 'host']) });
const StatusSchema = z.object({ status: z.enum(['joined', 'left', 'muted', 'active']) });

const inviteParticipant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = InviteSchema.parse(req.body);
    res.status(201).json({ success: true, data: { ...data, inviteId: 'uuid' } });
  } catch (error) {
    next(error);
  }
};

const joinParticipant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = IdParamSchema.parse(req.params);
    res.status(200).json({ success: true, data: { id, joined: true } });
  } catch (error) {
    next(error);
  }
};

const updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = IdParamSchema.parse(req.params);
    const { status } = StatusSchema.parse(req.body);
    res.status(200).json({ success: true, data: { id, status } });
  } catch (error) {
    next(error);
  }
};

const removeParticipant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = IdParamSchema.parse(req.params);
    res.status(200).json({ success: true, data: { id, removed: true } });
  } catch (error) {
    next(error);
  }
};

router.post('/invite', inviteParticipant);
router.post('/:id/join', joinParticipant);
router.patch('/:id/status', updateStatus);
router.delete('/:id', removeParticipant);

export default router;
