import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router({ mergeParams: true });

const BroadcastSchema = z.object({
  title: z.string().min(1, 'Broadcast title is required'),
  studioId: z.string().min(1),
  destinations: z.array(z.string()).min(1, 'At least one destination is required'),
  scheduledAt: z.string().datetime().optional(),
});

const StateTransitionSchema = z.object({
  action: z.enum(['start', 'stop', 'pause', 'resume']),
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = BroadcastSchema.parse(req.body);
    res.status(201).json({ success: true, data: { id: 'brc_1', status: 'idle', ...data } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
      return;
    }
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    res.status(200).json({ success: true, data: [] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.get('/:broadcastId', async (req: Request, res: Response): Promise<void> => {
  try {
    res.status(200).json({ success: true, data: { id: req.params.broadcastId, status: 'idle' } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// State machine transitions
router.post('/:broadcastId/state', async (req: Request, res: Response): Promise<void> => {
  try {
    const { action } = StateTransitionSchema.parse(req.body);
    
    // TODO: Implement actual state machine logic
    let nextStatus = 'idle';
    switch (action) {
      case 'start': nextStatus = 'live'; break;
      case 'stop': nextStatus = 'ended'; break;
      case 'pause': nextStatus = 'paused'; break;
      case 'resume': nextStatus = 'live'; break;
    }

    res.status(200).json({ success: true, data: { id: req.params.broadcastId, status: nextStatus } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
      return;
    }
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.delete('/:broadcastId', async (req: Request, res: Response): Promise<void> => {
  try {
    res.status(200).json({ success: true, data: null });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
