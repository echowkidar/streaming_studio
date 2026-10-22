import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { BrandType } from '@prisma/client';
import { HttpError, assertWorkspaceAccess, resolveWorkspaceId } from '../lib/access';

const router = Router();

const BrandAssetSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  brandType: z.enum([
    'LOGO',
    'OVERLAY',
    'BACKGROUND_IMAGE',
    'BACKGROUND_VIDEO',
    'LOWER_THIRD',
    'BANNER',
    'INTRO',
    'OUTRO',
    'FONT',
    'COLOR_THEME',
  ]),
  storagePath: z.string().optional(),
  settings: z.record(z.unknown()).optional().default({}),
  workspaceId: z.string().optional(),
});

const UpdateBrandAssetSchema = BrandAssetSchema.partial();

async function getOwnedBrandAsset(req: Request, id: string) {
  const asset = await prisma.brandAsset.findUnique({ where: { id } });
  if (!asset) throw new HttpError(404, 'Brand asset not found');
  await assertWorkspaceAccess(req, asset.workspaceId);
  return asset;
}

// POST /api/brand
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = BrandAssetSchema.parse(req.body);
    const workspaceId = await resolveWorkspaceId(req);

    const brandAsset = await prisma.brandAsset.create({
      data: {
        workspaceId,
        name: data.name,
        brandType: data.brandType as BrandType,
        storagePath: data.storagePath,
        settings: data.settings as any,
      },
    });

    res.status(201).json({ success: true, data: brandAsset });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors[0]?.message || 'Validation failed' });
      return;
    }
    next(error);
  }
});

// GET /api/brand
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const typeFilter = req.query.type as BrandType | undefined;

    const assets = await prisma.brandAsset.findMany({
      where: {
        workspaceId,
        ...(typeFilter ? { brandType: typeFilter } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ success: true, data: assets });
  } catch (error) {
    next(error);
  }
});

// GET /api/brand/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const asset = await getOwnedBrandAsset(req, req.params.id);

    res.status(200).json({ success: true, data: asset });
  } catch (error) {
    next(error);
  }
});

// PUT /api/brand/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = UpdateBrandAssetSchema.parse(req.body);
    await getOwnedBrandAsset(req, req.params.id);
    const updated = await prisma.brandAsset.update({
      where: { id: req.params.id },
      data: {
        name: data.name,
        brandType: data.brandType ? (data.brandType as BrandType) : undefined,
        storagePath: data.storagePath,
        settings: data.settings ? (data.settings as any) : undefined,
      },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors[0]?.message || 'Validation failed' });
      return;
    }
    next(error);
  }
});

// DELETE /api/brand/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await getOwnedBrandAsset(req, req.params.id);
    await prisma.brandAsset.delete({
      where: { id: req.params.id },
    });

    res.status(200).json({ success: true, data: { id: req.params.id, deleted: true } });
  } catch (error) {
    next(error);
  }
});

export default router;
