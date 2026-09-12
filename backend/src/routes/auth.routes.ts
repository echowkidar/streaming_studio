import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = RegisterSchema.parse(req.body);
    const mockId = 'usr_' + Date.now().toString(36);
    res.status(201).json({
      success: true,
      data: {
        user: {
          id: mockId,
          email: data.email,
          name: data.name,
          role: 'USER',
        },
        tokens: {
          accessToken: 'jwt_' + Math.random().toString(36).substring(2),
          refreshToken: 'refresh_' + Math.random().toString(36).substring(2),
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
      return;
    }
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = LoginSchema.parse(req.body);
    const isSuperAdmin = data.email.toLowerCase().trim() === 'admin@livestudio.io';
    const mockId = isSuperAdmin ? 'usr_1' : 'usr_' + Date.now().toString(36);
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: mockId,
          email: data.email,
          name: data.email.split('@')[0] || 'User',
          role: isSuperAdmin ? 'SUPER_ADMIN' : 'USER',
        },
        tokens: {
          accessToken: 'jwt_' + Math.random().toString(36).substring(2),
          refreshToken: 'refresh_' + Math.random().toString(36).substring(2),
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
      return;
    }
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  try {
    res.status(200).json({ success: true, data: null });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    res.status(200).json({
      success: true,
      data: {
        tokens: {
          accessToken: 'jwt_' + Math.random().toString(36).substring(2),
          refreshToken: 'refresh_' + Math.random().toString(36).substring(2),
        },
      },
    });
  } catch (error) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
  }
});

router.get('/me', async (req: Request, res: Response): Promise<void> => {
  try {
    res.status(200).json({
      success: true,
      data: { id: 'usr_1', email: 'admin@livestudio.io', name: 'Super Admin', role: 'SUPER_ADMIN' },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;

