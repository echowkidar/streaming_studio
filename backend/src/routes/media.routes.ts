import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const router = Router();

const IdParamSchema = z.object({ id: z.string().uuid() });
const FolderParamSchema = z.object({ folderId: z.string().uuid() });

const uploadMedia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.status(201).json({ success: true, data: { id: 'uuid', url: 'url' } });
  } catch (error) {
    next(error);
  }
};

const listMedia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.status(200).json({ success: true, data: [] });
  } catch (error) {
    next(error);
  }
};

const getMedia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = IdParamSchema.parse(req.params);
    res.status(200).json({ success: true, data: { id } });
  } catch (error) {
    next(error);
  }
};

const deleteMedia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = IdParamSchema.parse(req.params);
    res.status(200).json({ success: true, data: { id, deleted: true } });
  } catch (error) {
    next(error);
  }
};

const listFolders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.status(200).json({ success: true, data: [] });
  } catch (error) {
    next(error);
  }
};

const getFolderMedia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { folderId } = FolderParamSchema.parse(req.params);
    res.status(200).json({ success: true, data: { folderId, media: [] } });
  } catch (error) {
    next(error);
  }
};

router.post('/upload', uploadMedia);
router.get('/', listMedia);
router.get('/:id', getMedia);
router.delete('/:id', deleteMedia);
router.get('/folders', listFolders);
router.get('/folders/:folderId', getFolderMedia);

export default router;
