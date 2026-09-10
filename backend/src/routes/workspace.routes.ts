import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

const WorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required'),
  slug: z.string().min(3, 'Slug must be at least 3 characters').regex(/^[a-z0-9-]+$/, 'Invalid slug format'),
});

const UpdateWorkspaceSchema = WorkspaceSchema.partial();

const MemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['owner', 'admin', 'editor', 'viewer']),
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = WorkspaceSchema.parse(req.body);
    // TODO: Create workspace in DB
    res.status(201).json({ success: true, data: { id: 'ws_1', ...data } });
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
    // TODO: Fetch user's workspaces
    res.status(200).json({ success: true, data: [] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.get('/:workspaceId', async (req: Request, res: Response): Promise<void> => {
  try {
    res.status(200).json({ success: true, data: { id: req.params.workspaceId, name: 'Sample Workspace', slug: 'sample' } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.put('/:workspaceId', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = UpdateWorkspaceSchema.parse(req.body);
    res.status(200).json({ success: true, data: { id: req.params.workspaceId, ...data } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
      return;
    }
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.delete('/:workspaceId', async (req: Request, res: Response): Promise<void> => {
  try {
    res.status(200).json({ success: true, data: null });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// Member Management
router.post('/:workspaceId/members', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = MemberSchema.parse(req.body);
    res.status(201).json({ success: true, data: { workspaceId: req.params.workspaceId, ...data } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
      return;
    }
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.delete('/:workspaceId/members/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    res.status(200).json({ success: true, data: null });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
