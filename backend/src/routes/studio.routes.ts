import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router({ mergeParams: true });

const StudioSchema = z.object({
  name: z.string().min(1, 'Studio name is required'),
  description: z.string().optional(),
  settings: z.object({
    resolution: z.enum(['720p', '1080p', '4k']).default('1080p'),
    framerate: z.enum(['30', '60']).default('30'),
    layout: z.string().default('default'),
  }).optional(),
});

const UpdateStudioSchema = StudioSchema.partial();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = StudioSchema.parse(req.body);
    // TODO: Create studio in DB associated with workspace
    res.status(201).json({ success: true, data: { id: 'std_1', workspaceId: req.params.workspaceId, ...data } });
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
    // TODO: Fetch studios for workspace
    res.status(200).json({ success: true, data: [] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.get('/:studioId', async (req: Request, res: Response): Promise<void> => {
  try {
    res.status(200).json({ success: true, data: { id: req.params.studioId, name: 'Main Studio' } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.put('/:studioId', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = UpdateStudioSchema.parse(req.body);
    res.status(200).json({ success: true, data: { id: req.params.studioId, ...data } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
      return;
    }
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.delete('/:studioId', async (req: Request, res: Response): Promise<void> => {
  try {
    res.status(200).json({ success: true, data: null });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
