import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const router = Router();

// Zod schemas
const IdParamSchema = z.object({
  id: z.string().uuid(),
});

const RenameRecordingSchema = z.object({
  name: z.string().min(1).max(255),
});

const getRecordings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const recordings: Array<{ id: string; name: string; url: string }> = [];
    res.status(200).json({ success: true, data: recordings });
  } catch (error) {
    next(error);
  }
};

const getRecordingById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = IdParamSchema.parse(req.params);
    res.status(200).json({ success: true, data: { id, name: 'Recording', url: 'https://example.com' } });
  } catch (error) {
    next(error);
  }
};

const getRecordingDownloadUrl = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = IdParamSchema.parse(req.params);
    res.status(200).json({ success: true, data: { downloadUrl: `https://example.com/download/${id}` } });
  } catch (error) {
    next(error);
  }
};

const deleteRecording = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = IdParamSchema.parse(req.params);
    res.status(200).json({ success: true, data: { id, deleted: true } });
  } catch (error) {
    next(error);
  }
};

const renameRecording = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = IdParamSchema.parse(req.params);
    const { name } = RenameRecordingSchema.parse(req.body);
    res.status(200).json({ success: true, data: { id, name } });
  } catch (error) {
    next(error);
  }
};

// Routes
router.get('/', getRecordings);
router.get('/:id', getRecordingById);
router.get('/:id/download', getRecordingDownloadUrl);
router.delete('/:id', deleteRecording);
router.patch('/:id/rename', renameRecording);

export default router;
