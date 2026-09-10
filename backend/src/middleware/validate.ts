import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ApiResponse } from '../types';

export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, error: error.issues });
        return;
      }
      res.status(400).json({ success: false, error: 'Validation failed' });
    }
  };
};
