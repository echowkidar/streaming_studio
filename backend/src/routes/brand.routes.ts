import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const router = Router();

const IdParamSchema = z.object({ id: z.string().uuid() });
const BrandSchema = z.object({
  name: z.string().min(1),
  colors: z.object({ primary: z.string(), secondary: z.string() }).optional(),
  logoUrl: z.string().url().optional()
});

const getBrands = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.status(200).json({ success: true, data: [] });
  } catch (error) {
    next(error);
  }
};

const getBrandById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = IdParamSchema.parse(req.params);
    res.status(200).json({ success: true, data: { id } });
  } catch (error) {
    next(error);
  }
};

const createBrand = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = BrandSchema.parse(req.body);
    res.status(201).json({ success: true, data: { id: 'uuid', ...data } });
  } catch (error) {
    next(error);
  }
};

const updateBrand = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = IdParamSchema.parse(req.params);
    const data = BrandSchema.partial().parse(req.body);
    res.status(200).json({ success: true, data: { id, ...data } });
  } catch (error) {
    next(error);
  }
};

const deleteBrand = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = IdParamSchema.parse(req.params);
    res.status(200).json({ success: true, data: { id, deleted: true } });
  } catch (error) {
    next(error);
  }
};

router.get('/', getBrands);
router.get('/:id', getBrandById);
router.post('/', createBrand);
router.patch('/:id', updateBrand);
router.delete('/:id', deleteBrand);

export default router;
