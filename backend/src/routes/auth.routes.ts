import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { config } from '../config';
import { issueSessionToken, requireAuth } from '../middleware/auth';

const router = Router();

/** Passwords that were shipped in the public repo and must never be accepted again. */
const BLOCKED_PASSWORDS = new Set(['AdminPassword123!', 'MemberPassword123!']);
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser-not-a-real-password', 12);

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
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
});

const ChangeEmailSchema = z.object({
  newEmail: z.string().email(),
  password: z.string().min(1, 'Current password is required to verify identity'),
});

const UpdateProfileSchema = z.object({
  name: z.string().min(1, 'Display name cannot be empty'),
  avatarUrl: z.string().max(2048).optional(),
});

function validatePasswordStrength(pw: string): string | null {
  if (BLOCKED_PASSWORDS.has(pw)) return 'This password is publicly known. Please choose a different one.';
  if (pw.length < 8) return 'Password must be at least 8 characters long';
  return null;
}

async function ensurePersonalWorkspace(user: { id: string; name: string }) {
  const existing = await prisma.workspace.findFirst({ where: { ownerId: user.id }, orderBy: { createdAt: 'asc' } });
  if (existing) return existing;
  return prisma.workspace.create({
    data: {
      name: `${user.name || 'User'}'s Studio`,
      slug: `ws-${user.id.toLowerCase().slice(-8)}-${Date.now()}`,
      ownerId: user.id,
      members: { create: { userId: user.id, role: 'OWNER' } },
    },
  });
}

function publicUser(user: { id: string; email: string; name: string; role: string }) {
  return {
    id: user.id,
    email: user.email,
    name: user.name || user.email.split('@')[0] || 'User',
    role: user.role,
  };
}

router.post('/register', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!config.ALLOW_REGISTRATION) {
      res.status(403).json({ success: false, error: 'Registration is disabled. Ask an administrator for an account.' });
      return;
    }
    const data = RegisterSchema.parse(req.body);
    const pwProblem = validatePasswordStrength(data.password);
    if (pwProblem) {
      res.status(400).json({ success: false, error: pwProblem });
      return;
    }
    const emailNorm = data.email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email: emailNorm } });
    if (existing) {
      res.status(400).json({ success: false, error: 'An account with this email already exists' });
      return;
    }

    const user = await prisma.user.create({
      data: {
        email: emailNorm,
        passwordHash: await bcrypt.hash(data.password, 12),
        name: data.name.trim(),
        role: 'USER',
      },
    });
    const workspace = await ensurePersonalWorkspace(user);
    const token = await issueSessionToken(user.id, req);

    res.status(201).json({
      success: true,
      data: {
        user: publicUser(user),
        workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug },
        tokens: { accessToken: token, refreshToken: token },
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = LoginSchema.parse(req.body);
    const emailNorm = data.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({ where: { email: emailNorm } });
    // Always run bcrypt so response time does not reveal whether the email exists.
    const hash = user?.passwordHash && user.passwordHash.startsWith('$2') ? user.passwordHash : DUMMY_HASH;
    const valid = await bcrypt.compare(data.password, hash).catch(() => false);

    if (!user || !valid) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }
    if (user.isBanned) {
      res.status(403).json({ success: false, error: 'This account has been suspended' });
      return;
    }
    if (BLOCKED_PASSWORDS.has(data.password)) {
      res.status(403).json({
        success: false,
        error: 'This account still uses a publicly known default password and is locked. Set ADMIN_PASSWORD in the server environment and restart, or ask an admin to reset it.',
      });
      return;
    }

    const workspace = await ensurePersonalWorkspace(user);
    const token = await issueSessionToken(user.id, req);

    res.status(200).json({
      success: true,
      data: {
        user: publicUser(user),
        workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug },
        tokens: { accessToken: token, refreshToken: token },
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  if (req.user) {
    await prisma.session.delete({ where: { id: req.user.sessionId } }).catch(() => null);
  }
  res.status(200).json({ success: true, data: null });
});

router.post('/refresh', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Rotate: drop the current session and issue a new one.
    await prisma.session.delete({ where: { id: req.user!.sessionId } }).catch(() => null);
    const token = await issueSessionToken(req.user!.id, req);
    res.status(200).json({ success: true, data: { tokens: { accessToken: token, refreshToken: token } } });
  } catch (error) {
    next(error);
  }
});

router.get('/me', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      // SESSION_REVOKED makes the frontend clear its stored token and go to /login.
      res.status(401).json({ success: false, error: 'SESSION_REVOKED', message: 'Session expired or revoked. Please log in again.' });
      return;
    }
    const workspace = await prisma.workspace.findFirst({
      where: { ownerId: req.user.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, slug: true },
    });
    res.status(200).json({ success: true, data: { ...publicUser(req.user), workspace: workspace || null } });
  } catch (error) {
    next(error);
  }
});

router.post('/change-password', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = ChangePasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      res.status(404).json({ success: false, error: 'User account not found' });
      return;
    }
    const isValid = await bcrypt.compare(data.currentPassword, user.passwordHash).catch(() => false);
    if (!isValid) {
      res.status(400).json({ success: false, error: 'Current password is incorrect' });
      return;
    }
    const pwProblem = validatePasswordStrength(data.newPassword);
    if (pwProblem) {
      res.status(400).json({ success: false, error: pwProblem });
      return;
    }

    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(data.newPassword, 12) } });
    // Revoke every session (including this one) and give this device a fresh one.
    await prisma.session.deleteMany({ where: { userId: user.id } });
    const token = await issueSessionToken(user.id, req);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully! All other active sessions have been revoked.',
      data: { tokens: { accessToken: token, refreshToken: token } },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/change-email', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = ChangeEmailSchema.parse(req.body);
    const newEmail = data.newEmail.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      res.status(404).json({ success: false, error: 'User account not found' });
      return;
    }
    if (user.email === newEmail) {
      res.status(400).json({ success: false, error: 'New email must be different from current email' });
      return;
    }
    const isValid = await bcrypt.compare(data.password, user.passwordHash).catch(() => false);
    if (!isValid) {
      res.status(400).json({ success: false, error: 'Current password verification failed' });
      return;
    }
    const taken = await prisma.user.findUnique({ where: { email: newEmail } });
    if (taken) {
      res.status(400).json({ success: false, error: 'This email is already registered to another account' });
      return;
    }
    await prisma.user.update({ where: { id: user.id }, data: { email: newEmail } });
    res.status(200).json({ success: true, message: 'Email address updated successfully!', data: { newEmail } });
  } catch (error) {
    next(error);
  }
});

router.post('/update-profile', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = UpdateProfileSchema.parse(req.body);
    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        name: data.name.trim(),
        ...(data.avatarUrl ? { avatarUrl: data.avatarUrl } : {}),
      },
    });
    res.status(200).json({
      success: true,
      message: 'Profile information updated successfully!',
      data: { name: updated.name, avatarUrl: updated.avatarUrl },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
