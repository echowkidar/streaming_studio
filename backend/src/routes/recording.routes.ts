import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { prisma } from '../lib/prisma';
import { StorageService } from '../services/storage.service';

const router = Router();
const storageService = new StorageService();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } }); // 500MB

const RenameRecordingSchema = z.object({
  name: z.string().min(1).max(255),
});

// Helper to serialize BigInt for JSON responses
function serializeRecording(recording: any) {
  return {
    ...recording,
    fileSize: recording.fileSize ? Number(recording.fileSize) : 0,
  };
}

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

// GET /api/recordings
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const recordings = await prisma.recording.findMany({
      where: { workspaceId },
      include: {
        broadcast: { select: { id: true, title: true, startedAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: recordings.map(serializeRecording),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/recordings/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const recording = await prisma.recording.findUnique({
      where: { id: req.params.id },
      include: {
        broadcast: true,
        tracks: true,
        aiClips: true,
        transcripts: true,
      },
    });

    if (!recording) {
      res.status(404).json({ success: false, error: 'Recording not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: serializeRecording(recording),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/recordings/:id/download
router.get('/:id/download', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const recording = await prisma.recording.findUnique({
      where: { id: req.params.id },
    });

    if (!recording || !recording.storagePath) {
      res.status(404).json({ success: false, error: 'Recording file not found' });
      return;
    }

    const presigned = await storageService.getPresignedUrl(recording.storagePath, undefined, 7200);
    if (!presigned.success || !presigned.data) {
      res.status(500).json({ success: false, error: 'Failed to generate download URL' });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        downloadUrl: presigned.data,
        fileName: `${recording.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.mp4`,
        fileSize: Number(recording.fileSize || 0),
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/recordings/upload (Multipart upload for completed studio broadcasts)
router.post('/upload', upload.single('recording'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'Recording file is required' });
      return;
    }

    const title = (req.body.title as string) || `Broadcast Recording ${new Date().toLocaleDateString()}`;
    const duration = parseInt(req.body.duration as string, 10) || 0;
    const resolution = (req.body.resolution as string) || '1080p';
    const workspaceId = await resolveWorkspaceId(req);

    // Resolve or create broadcast record
    let broadcastId = req.body.broadcastId as string;
    if (!broadcastId) {
      let studio = await prisma.studio.findFirst({ where: { workspaceId } });
      if (!studio) {
        studio = await prisma.studio.create({
          data: { workspaceId, name: 'Main Studio' },
        });
      }
      const broadcast = await prisma.broadcast.create({
        data: {
          title,
          studioId: studio.id,
          workspaceId,
          status: 'ENDED',
          endedAt: new Date(),
        },
      });
      broadcastId = broadcast.id;
    }

    const storageKey = `recordings/${workspaceId}/${broadcastId}-${Date.now()}.webm`;
    const uploadRes = await storageService.uploadFile({
      key: storageKey,
      contentType: req.file.mimetype || 'video/webm',
      body: req.file.buffer,
    });

    if (!uploadRes.success) {
      res.status(500).json({ success: false, error: uploadRes.error || 'Failed to upload recording to storage' });
      return;
    }

    const recording = await prisma.recording.create({
      data: {
        title,
        broadcastId,
        workspaceId,
        duration,
        resolution,
        fileSize: BigInt(req.file.size),
        storagePath: storageKey,
        status: 'READY',
      },
    });

    res.status(201).json({
      success: true,
      data: serializeRecording(recording),
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/recordings/:id (rename)
router.patch('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name } = RenameRecordingSchema.parse(req.body);
    const updated = await prisma.recording.update({
      where: { id: req.params.id },
      data: { title: name },
    });

    res.status(200).json({
      success: true,
      data: serializeRecording(updated),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors[0]?.message || 'Validation failed' });
      return;
    }
    next(error);
  }
});

// DELETE /api/recordings/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.recording.delete({
      where: { id: req.params.id },
    });

    res.status(200).json({ success: true, data: { id: req.params.id, deleted: true } });
  } catch (error) {
    next(error);
  }
});

export default router;
