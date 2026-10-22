import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import multer from 'multer';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { StorageService } from '../services/storage.service';
import { HttpError, assertWorkspaceAccess, getAccessibleBroadcast, resolveWorkspaceId } from '../lib/access';
import { uploadsSubdir } from '../lib/paths';
import { createSignedQuery } from '../lib/signedUrl';
import { takeCompletedUpload } from './upload.routes';

// Mounted behind requireAuth in server.ts
const router = Router();
const storageService = new StorageService();
const upload = multer({
  dest: uploadsSubdir('tmp-multer'),
  limits: { fileSize: 500 * 1024 * 1024 }, // larger recordings go through chunked /api/uploads
});

const RenameRecordingSchema = z.object({
  name: z.string().min(1).max(255),
});

function serializeRecording(recording: any) {
  return {
    ...recording,
    fileSize: recording.fileSize ? Number(recording.fileSize) : 0,
  };
}

async function getOwnedRecording(req: Request, id: string) {
  const recording = await prisma.recording.findUnique({ where: { id } });
  if (!recording) throw new HttpError(404, 'Recording not found');
  await assertWorkspaceAccess(req, recording.workspaceId);
  return recording;
}

// GET /api/recordings
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const recordings = await prisma.recording.findMany({
      where: { workspaceId },
      include: { broadcast: { select: { id: true, title: true, startedAt: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json({ success: true, data: recordings.map(serializeRecording) });
  } catch (error) {
    next(error);
  }
});

// GET /api/recordings/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await getOwnedRecording(req, req.params.id);
    const recording = await prisma.recording.findUnique({
      where: { id: req.params.id },
      include: { broadcast: true, tracks: true, aiClips: true, transcripts: true },
    });
    res.status(200).json({ success: true, data: serializeRecording(recording) });
  } catch (error) {
    next(error);
  }
});

// GET /api/recordings/:id/download -> short-lived signed link served by the API
// (the old MinIO presigned URL pointed at http://minio:9000, which browsers cannot reach)
router.get('/:id/download', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const recording = await getOwnedRecording(req, req.params.id);
    if (!recording.storagePath) throw new HttpError(404, 'Recording file not found');
    res.status(200).json({
      success: true,
      data: {
        downloadUrl: `/api/media/recording-file/${recording.id}?${createSignedQuery(`recording:${recording.id}`, 2 * 3600)}`,
        fileName: `${recording.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.webm`,
        fileSize: Number(recording.fileSize || 0),
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/recordings/upload  (multipart `recording` ≤500MB, or `uploadId` from chunked upload)
router.post('/upload', upload.single('recording'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  let tmpPath: string | null = null;
  try {
    let fileInfo: { path: string; mimetype: string; size: number } | null = null;
    if (req.file) fileInfo = { path: req.file.path, mimetype: req.file.mimetype, size: req.file.size };
    else if (typeof req.body.uploadId === 'string' && req.body.uploadId) fileInfo = await takeCompletedUpload(req, req.body.uploadId);
    if (!fileInfo) throw new HttpError(400, 'Recording file is required');
    tmpPath = fileInfo.path;
    if (!/^video\/(webm|mp4|x-matroska)/i.test(fileInfo.mimetype || '')) {
      throw new HttpError(400, 'Recording must be a WEBM or MP4 video');
    }

    const title = String(req.body.title || `Broadcast Recording ${new Date().toLocaleDateString()}`).slice(0, 255);
    const duration = parseInt(String(req.body.duration), 10) || 0;
    const resolution = String(req.body.resolution || '1080p').slice(0, 20);

    let broadcastId: string;
    let workspaceId: string;
    if (req.body.broadcastId) {
      const b = await getAccessibleBroadcast(req, String(req.body.broadcastId), { createForStudio: true });
      broadcastId = b.id;
      workspaceId = b.workspaceId;
    } else {
      workspaceId = await resolveWorkspaceId(req);
      let studio = await prisma.studio.findFirst({ where: { workspaceId } });
      if (!studio) studio = await prisma.studio.create({ data: { workspaceId, name: 'Main Studio' } });
      const broadcast = await prisma.broadcast.create({
        data: { title, studioId: studio.id, workspaceId, status: 'ENDED', endedAt: new Date() },
      });
      broadcastId = broadcast.id;
    }

    const ext = /mp4/i.test(fileInfo.mimetype) ? 'mp4' : 'webm';
    const storageKey = `recordings/${workspaceId}/${broadcastId}-${Date.now()}.${ext}`;
    const uploadRes = await storageService.uploadFile({
      key: storageKey,
      contentType: fileInfo.mimetype || 'video/webm',
      body: fs.createReadStream(fileInfo.path),
      contentLength: fileInfo.size,
    });
    if (!uploadRes.success) throw new HttpError(500, uploadRes.error || 'Failed to upload recording to storage');

    const recording = await prisma.recording.create({
      data: {
        title,
        broadcastId,
        workspaceId,
        duration,
        resolution,
        fileSize: BigInt(fileInfo.size),
        storagePath: storageKey,
        status: 'READY',
      },
    });
    res.status(201).json({ success: true, data: serializeRecording(recording) });
  } catch (error) {
    next(error);
  } finally {
    if (tmpPath) await fs.promises.unlink(tmpPath).catch(() => null);
  }
});

// PATCH /api/recordings/:id (rename)
router.patch('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name } = RenameRecordingSchema.parse(req.body);
    await getOwnedRecording(req, req.params.id);
    const updated = await prisma.recording.update({ where: { id: req.params.id }, data: { title: name } });
    res.status(200).json({ success: true, data: serializeRecording(updated) });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/recordings/:id  (also removes the file from storage)
router.delete('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const recording = await getOwnedRecording(req, req.params.id);
    if (recording.storagePath) await storageService.deleteFile(recording.storagePath).catch(() => null);
    await prisma.recording.delete({ where: { id: recording.id } });
    res.status(200).json({ success: true, data: { id: recording.id, deleted: true } });
  } catch (error) {
    next(error);
  }
});

export default router;
