import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { WebinarStatus } from '@prisma/client';

const router = Router();

const WebinarSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  scheduledAt: z.string().datetime().or(z.string().min(1)),
  durationMinutes: z.number().int().default(60),
  timezone: z.string().default('UTC'),
  registrationEnabled: z.boolean().default(true),
  chatEnabled: z.boolean().default(true),
  viewerLimit: z.number().int().default(1000),
  workspaceId: z.string().optional(),
});

const RegistrantSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  country: z.string().optional(),
});

const MessageSchema = z.object({
  authorName: z.string().min(1),
  authorEmail: z.string().email().optional(),
  message: z.string().min(1),
});

async function resolveWorkspaceId(req: Request): Promise<string> {
  const reqWsId = req.headers['x-workspace-id'] as string;
  if (reqWsId) {
    const ws = await prisma.workspace.findUnique({ where: { id: reqWsId } });
    if (ws) return ws.id;
  }
  const defaultWs = await prisma.workspace.findFirst({ orderBy: { createdAt: 'asc' } });
  if (defaultWs) return defaultWs.id;
  const newWs = await prisma.workspace.create({
    data: {
      name: 'Default Workspace',
      slug: `default-${Date.now()}`,
      owner: {
        create: {
          email: `admin-${Date.now()}@livestudio.io`,
          passwordHash: 'seeded',
          name: 'Super Admin',
          role: 'SUPER_ADMIN',
        },
      },
    },
  });
  return newWs.id;
}

// POST /api/webinars
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = WebinarSchema.parse(req.body);
    const workspaceId = data.workspaceId || (await resolveWorkspaceId(req));

    const webinar = await prisma.webinar.create({
      data: {
        workspaceId,
        title: data.title,
        description: data.description,
        scheduledAt: new Date(data.scheduledAt),
        durationMinutes: data.durationMinutes,
        timezone: data.timezone,
        registrationEnabled: data.registrationEnabled,
        chatEnabled: data.chatEnabled,
        viewerLimit: data.viewerLimit,
        status: 'SCHEDULED',
      },
    });

    res.status(201).json({ success: true, data: webinar });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors[0]?.message || 'Validation failed' });
      return;
    }
    next(error);
  }
});

// GET /api/webinars
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const webinars = await prisma.webinar.findMany({
      where: { workspaceId },
      include: {
        _count: {
          select: { registrants: true, messages: true },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    res.status(200).json({ success: true, data: webinars });
  } catch (error) {
    next(error);
  }
});

// GET /api/webinars/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const webinar = await prisma.webinar.findUnique({
      where: { id: req.params.id },
      include: {
        _count: { select: { registrants: true } },
      },
    });

    if (!webinar) {
      res.status(404).json({ success: false, error: 'Webinar not found' });
      return;
    }

    res.status(200).json({ success: true, data: webinar });
  } catch (error) {
    next(error);
  }
});

// POST /api/webinars/:id/register (Public viewer registration)
router.post('/:id/register', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = RegistrantSchema.parse(req.body);
    const webinar = await prisma.webinar.findUnique({ where: { id: req.params.id } });

    if (!webinar) {
      res.status(404).json({ success: false, error: 'Webinar not found' });
      return;
    }

    if (!webinar.registrationEnabled) {
      res.status(400).json({ success: false, error: 'Registration is closed for this webinar' });
      return;
    }

    const registrant = await prisma.webinarRegistrant.create({
      data: {
        webinarId: webinar.id,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        country: data.country,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        registrantId: registrant.id,
        webinarTitle: webinar.title,
        scheduledAt: webinar.scheduledAt,
        watchUrl: `/watch/${webinar.id}`,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors[0]?.message || 'Validation failed' });
      return;
    }
    next(error);
  }
});

// GET /api/webinars/:id/messages
router.get('/:id/messages', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const messages = await prisma.webinarMessage.findMany({
      where: { webinarId: req.params.id, isDeleted: false },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
});

// POST /api/webinars/:id/messages
router.post('/:id/messages', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = MessageSchema.parse(req.body);
    const message = await prisma.webinarMessage.create({
      data: {
        webinarId: req.params.id,
        authorName: data.authorName,
        authorEmail: data.authorEmail,
        message: data.message,
      },
    });
    res.status(201).json({ success: true, data: message });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors[0]?.message || 'Validation failed' });
      return;
    }
    next(error);
  }
});

// DELETE /api/webinars/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.webinar.delete({ where: { id: req.params.id } });
    res.status(200).json({ success: true, data: { id: req.params.id, deleted: true } });
  } catch (error) {
    next(error);
  }
});

export default router;
