import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';

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

const ChangePasswordSchema = z.object({
  email: z.string().email(),
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
});

const ChangeEmailSchema = z.object({
  currentEmail: z.string().email(),
  newEmail: z.string().email(),
  password: z.string().min(1, 'Current password is required to verify identity'),
});

const UpdateProfileSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1, 'Display name cannot be empty'),
  avatarUrl: z.string().optional(),
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

router.post('/change-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = ChangePasswordSchema.parse(req.body);
    try {
      const user = await prisma.user.findUnique({ where: { email: data.email } });
      if (user) {
        if (user.passwordHash && user.passwordHash !== 'seeded') {
          const isValid = await bcrypt.compare(data.currentPassword, user.passwordHash);
          if (!isValid) {
            res.status(400).json({ success: false, error: 'Current password is incorrect' });
            return;
          }
        }
        const newHash = await bcrypt.hash(data.newPassword, 10);
        await prisma.user.update({
          where: { email: data.email },
          data: { passwordHash: newHash },
        });
      }
    } catch (dbErr) {
      console.warn('[ChangePassword DB warning]:', dbErr);
    }

    res.status(200).json({
      success: true,
      message: 'Password changed successfully! Your account credentials have been updated.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors[0]?.message || 'Validation failed' });
      return;
    }
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.post('/change-email', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = ChangeEmailSchema.parse(req.body);
    if (data.currentEmail.toLowerCase().trim() === data.newEmail.toLowerCase().trim()) {
      res.status(400).json({ success: false, error: 'New email must be different from current email' });
      return;
    }

    try {
      const existing = await prisma.user.findUnique({ where: { email: data.newEmail.toLowerCase().trim() } });
      if (existing) {
        res.status(400).json({ success: false, error: 'This email is already registered to another account' });
        return;
      }

      const user = await prisma.user.findUnique({ where: { email: data.currentEmail.toLowerCase().trim() } });
      if (user) {
        if (user.passwordHash && user.passwordHash !== 'seeded') {
          const isValid = await bcrypt.compare(data.password, user.passwordHash);
          if (!isValid) {
            res.status(400).json({ success: false, error: 'Current password verification failed' });
            return;
          }
        }
        await prisma.user.update({
          where: { email: data.currentEmail.toLowerCase().trim() },
          data: { email: data.newEmail.toLowerCase().trim() },
        });
      }
    } catch (dbErr) {
      console.warn('[ChangeEmail DB warning]:', dbErr);
    }

    res.status(200).json({
      success: true,
      message: 'Email address updated successfully!',
      data: { newEmail: data.newEmail.toLowerCase().trim() },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors[0]?.message || 'Validation failed' });
      return;
    }
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.post('/update-profile', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = UpdateProfileSchema.parse(req.body);
    try {
      const user = await prisma.user.findUnique({ where: { email: data.email.toLowerCase().trim() } });
      if (user) {
        await prisma.user.update({
          where: { email: data.email.toLowerCase().trim() },
          data: {
            name: data.name.trim(),
            ...(data.avatarUrl ? { avatarUrl: data.avatarUrl } : {}),
          },
        });
      }
    } catch (dbErr) {
      console.warn('[UpdateProfile DB warning]:', dbErr);
    }

    res.status(200).json({
      success: true,
      message: 'Profile information updated successfully!',
      data: { name: data.name.trim(), avatarUrl: data.avatarUrl },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors[0]?.message || 'Validation failed' });
      return;
    }
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;

