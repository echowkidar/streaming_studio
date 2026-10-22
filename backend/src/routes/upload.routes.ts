/**
 * Chunked uploads.
 *
 * Cloudflare Tunnel rejects any single request body above 100 MB, so large files (recordings,
 * pre-recorded videos, big media) are sent in ≤ 32 MB parts:
 *   POST /api/uploads/init                 { fileName, fileSize, mimeType } -> { uploadId, chunkSize }
 *   PUT  /api/uploads/:uploadId/chunk?index=N   (raw body)
 *   POST /api/uploads/:uploadId/complete   -> { uploadId, size }
 * The finished `uploadId` is then passed to the normal endpoint (media upload, recording upload,
 * schedule-prerecorded) instead of a multipart file.
 */
import express, { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { z } from 'zod';
import { HttpError } from '../lib/access';
import { uploadsSubdir } from '../lib/paths';

// Mounted behind requireAuth in server.ts
const router = Router();
const CHUNK_DIR = uploadsSubdir('tmp-chunked');
const CHUNK_SIZE = 32 * 1024 * 1024;
const MAX_FILE_SIZE = 4 * 1024 * 1024 * 1024; // 4 GB

interface UploadMeta {
  userId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  totalChunks: number;
  createdAt: number;
  completed?: boolean;
}

const InitSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().positive().max(MAX_FILE_SIZE),
  mimeType: z.string().max(100).default('application/octet-stream'),
});

function dirFor(uploadId: string): string {
  if (!/^[a-f0-9]{32}$/.test(uploadId)) throw new HttpError(400, 'Invalid upload id');
  return path.join(CHUNK_DIR, uploadId);
}

async function readMeta(req: Request, uploadId: string): Promise<UploadMeta> {
  const dir = dirFor(uploadId);
  const raw = await fs.promises.readFile(path.join(dir, 'meta.json'), 'utf8').catch(() => null);
  if (!raw) throw new HttpError(404, 'Upload not found or expired');
  const meta = JSON.parse(raw) as UploadMeta;
  if (meta.userId !== req.user!.id) throw new HttpError(404, 'Upload not found or expired');
  return meta;
}

router.post('/init', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = InitSchema.parse(req.body);
    const uploadId = crypto.randomBytes(16).toString('hex');
    const dir = dirFor(uploadId);
    await fs.promises.mkdir(dir, { recursive: true });
    const meta: UploadMeta = {
      userId: req.user!.id,
      fileName: data.fileName,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      totalChunks: Math.ceil(data.fileSize / CHUNK_SIZE),
      createdAt: Date.now(),
    };
    await fs.promises.writeFile(path.join(dir, 'meta.json'), JSON.stringify(meta));
    res.status(201).json({ success: true, data: { uploadId, chunkSize: CHUNK_SIZE, totalChunks: meta.totalChunks } });
  } catch (error) {
    next(error);
  }
});

router.put(
  '/:uploadId/chunk',
  express.raw({ type: '*/*', limit: CHUNK_SIZE + 1024 * 1024 }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const meta = await readMeta(req, req.params.uploadId);
      const index = parseInt(String(req.query.index ?? ''), 10);
      if (!Number.isInteger(index) || index < 0 || index >= meta.totalChunks) throw new HttpError(400, 'Invalid chunk index');
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) throw new HttpError(400, 'Empty chunk');
      await fs.promises.writeFile(path.join(dirFor(req.params.uploadId), `${index}.part`), req.body);
      res.status(200).json({ success: true, data: { index, size: req.body.length } });
    } catch (error) {
      next(error);
    }
  }
);

router.post('/:uploadId/complete', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const meta = await readMeta(req, req.params.uploadId);
    const dir = dirFor(req.params.uploadId);
    const finalPath = path.join(dir, 'file');
    const out = fs.createWriteStream(finalPath);
    try {
      for (let i = 0; i < meta.totalChunks; i++) {
        const partPath = path.join(dir, `${i}.part`);
        if (!fs.existsSync(partPath)) throw new HttpError(400, `Chunk ${i} is missing`);
        await new Promise<void>((resolve, reject) => {
          const rs = fs.createReadStream(partPath);
          rs.on('error', reject);
          rs.on('end', resolve);
          rs.pipe(out, { end: false });
        });
      }
    } finally {
      await new Promise<void>((resolve) => out.end(resolve));
    }
    const size = (await fs.promises.stat(finalPath)).size;
    if (size !== meta.fileSize) throw new HttpError(400, `Upload size mismatch (${size} != ${meta.fileSize})`);
    for (let i = 0; i < meta.totalChunks; i++) await fs.promises.unlink(path.join(dir, `${i}.part`)).catch(() => null);
    meta.completed = true;
    await fs.promises.writeFile(path.join(dir, 'meta.json'), JSON.stringify(meta));
    res.status(200).json({ success: true, data: { uploadId: req.params.uploadId, size } });
  } catch (error) {
    next(error);
  }
});

/**
 * Hand a completed chunked upload to a consumer route. The file is moved out of the chunk area,
 * so the caller owns (and must move or delete) the returned path.
 */
export async function takeCompletedUpload(
  req: Request,
  uploadId: string
): Promise<{ path: string; originalname: string; mimetype: string; size: number }> {
  if (!req.user) throw new HttpError(401, 'Unauthorized');
  const meta = await readMeta(req, uploadId);
  if (!meta.completed) throw new HttpError(400, 'Upload is not complete');
  const dir = dirFor(uploadId);
  const target = path.join(CHUNK_DIR, `${uploadId}.taken`);
  await fs.promises.rename(path.join(dir, 'file'), target);
  await fs.promises.rm(dir, { recursive: true, force: true });
  return { path: target, originalname: meta.fileName, mimetype: meta.mimeType, size: meta.fileSize };
}

// Remove abandoned uploads after 24h
setInterval(async () => {
  try {
    for (const entry of await fs.promises.readdir(CHUNK_DIR)) {
      const full = path.join(CHUNK_DIR, entry);
      const st = await fs.promises.stat(full).catch(() => null);
      if (st && Date.now() - st.mtimeMs > 24 * 3600 * 1000) {
        await fs.promises.rm(full, { recursive: true, force: true }).catch(() => null);
      }
    }
  } catch { }
}, 60 * 60 * 1000);

export default router;
