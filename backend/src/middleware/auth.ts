import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config, sessionTtlMs } from '../config';
import { prisma } from '../lib/prisma';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'USER';
  sessionId: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

interface SessionTokenPayload {
  userId: string;
  sid: string;
}

/** Create a DB-backed session and return a signed JWT that references it. */
export async function issueSessionToken(
  userId: string,
  req?: Request
): Promise<string> {
  const sid = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + sessionTtlMs());
  await prisma.session.create({
    data: {
      userId,
      refreshToken: sid,
      expiresAt,
      ipAddress: req?.ip?.slice(0, 100) || null,
      userAgent: (req?.headers['user-agent'] || '').toString().slice(0, 300) || null,
    },
  });
  return jwt.sign({ userId, sid }, config.JWT_SECRET, {
    expiresIn: Math.floor(sessionTtlMs() / 1000),
  });
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    const t = header.slice(7).trim();
    return t || null;
  }
  return null;
}

/**
 * Resolve the logged-in user (if any) and attach it as req.user.
 * Never rejects — use requireAuth after it for protected routes.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = extractToken(req);
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as SessionTokenPayload;
    if (!decoded?.userId || !decoded?.sid) return next();

    const session = await prisma.session.findUnique({
      where: { refreshToken: decoded.sid },
      include: { user: { select: { id: true, email: true, name: true, role: true, isBanned: true } } },
    });

    if (
      session &&
      session.userId === decoded.userId &&
      session.expiresAt.getTime() > Date.now() &&
      !session.user.isBanned
    ) {
      req.user = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
        sessionId: session.id,
      };
    }
  } catch {
    // invalid / expired token -> treated as anonymous
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Unauthorized: please log in again' });
    return;
  }
  next();
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Unauthorized: please log in again' });
    return;
  }
  if (req.user.role !== 'SUPER_ADMIN') {
    res.status(403).json({ success: false, error: 'Forbidden: Super Admin only' });
    return;
  }
  next();
}
