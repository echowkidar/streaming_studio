import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import * as jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { StorageService } from '../services/storage.service';
import { AssetType } from '@prisma/client';
import { config } from '../config';

const router = Router();
const storageService = new StorageService();

// Dedicated local disk storage for studio session media (100% reliable, zero LiveKit data)
const LOCAL_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'session-media');
if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
  fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
}

// Function to immediately purge all temporary media files for a studio session
export async function deleteSessionMedia(sessionId: string): Promise<number> {
  if (!sessionId) return 0;
  const cleanId = sessionId.replace(/^studio-/, '');
  let count = 0;

  try {
    const assets = await prisma.mediaAsset.findMany({
      where: {
        OR: [
          { tags: { has: `studio-${sessionId}` } },
          { tags: { has: `studio-${cleanId}` } },
          { tags: { has: `session-${sessionId}` } },
          { tags: { has: `session-${cleanId}` } },
        ],
      },
    });

    for (const asset of assets) {
      if (asset.storagePath.startsWith('local://')) {
        const relPath = asset.storagePath.replace('local://', '');
        const fullLocalPath = path.join(LOCAL_UPLOAD_DIR, relPath);
        if (fs.existsSync(fullLocalPath)) {
          await fs.promises.unlink(fullLocalPath).catch(() => null);
        }
      } else {
        await storageService.deleteFile(asset.storagePath).catch(() => null);
      }

      await prisma.mediaAsset.delete({ where: { id: asset.id } }).catch(() => null);
      count++;
    }

    if (count > 0) {
      console.log(`[Media Cleanup] Successfully purged ${count} temporary session media file(s) for session: ${sessionId}`);
    }
  } catch (err) {
    console.error(`[Media Cleanup] Error purging session media for ${sessionId}:`, err);
  }

  return count;
}

// 10-Minute Safety Grace Period Background Sweeper
// Runs every 60 seconds to auto-clean temporary media abandoned for > 10 minutes when broadcast is not LIVE
const TEN_MINUTES_MS = 10 * 60 * 1000;

setInterval(async () => {
  try {
    const tenMinutesAgo = new Date(Date.now() - TEN_MINUTES_MS);
    const expiredAssets = await prisma.mediaAsset.findMany({
      where: {
        tags: { has: 'temporary' },
        createdAt: { lt: tenMinutesAgo },
      },
    });

    if (expiredAssets.length === 0) return;

    for (const asset of expiredAssets) {
      const meta = (asset.metadata as Record<string, any>) || {};
      const studioId = meta.studioId || '';
      const cleanId = studioId.replace(/^studio-/, '');

      let isBroadcastLive = false;
      if (cleanId) {
        try {
          const b = await prisma.broadcast.findUnique({
            where: { id: cleanId },
            select: { status: true },
          });
          if (b && b.status === 'LIVE') {
            isBroadcastLive = true;
          }
        } catch {}
      }

      if (!isBroadcastLive) {
        if (asset.storagePath.startsWith('local://')) {
          const relPath = asset.storagePath.replace('local://', '');
          const fullLocalPath = path.join(LOCAL_UPLOAD_DIR, relPath);
          if (fs.existsSync(fullLocalPath)) {
            await fs.promises.unlink(fullLocalPath).catch(() => null);
          }
        } else {
          await storageService.deleteFile(asset.storagePath).catch(() => null);
        }

        await prisma.mediaAsset.delete({ where: { id: asset.id } }).catch(() => null);
        console.log(`[Media Sweeper] Auto-cleaned abandoned session media: "${asset.name}" (${asset.id})`);
      }
    }
  } catch {
    // Non-fatal background error
  }
}, 60000);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
});

async function resolveWorkspaceId(req: Request): Promise<string> {
  const reqWsId = (req.headers['x-workspace-id'] as string) || (req.body?.workspaceId as string);
  if (reqWsId && reqWsId !== 'default') {
    try {
      const ws = await prisma.workspace.findUnique({ where: { id: reqWsId } });
      if (ws) return ws.id;
    } catch {
      return reqWsId;
    }
  }

  // Check authenticated user from JWT Bearer token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const secret = config.JWT_SECRET || process.env.JWT_SECRET || 'livestudio-jwt-secret-key-2026';
      const decoded = jwt.decode(token) as { userId?: string } | null;
      if (decoded?.userId) {
        let userWs = await prisma.workspace.findFirst({
          where: { ownerId: decoded.userId },
        });

        if (!userWs) {
          const membership = await prisma.workspaceMember.findFirst({
            where: { userId: decoded.userId },
            include: { workspace: true },
          });
          if (membership?.workspace) {
            userWs = membership.workspace;
          }
        }

        if (!userWs) {
          const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
          if (user) {
            userWs = await prisma.workspace.create({
              data: {
                name: `${user.name || 'User'}'s Studio`,
                slug: `ws-${user.id.toLowerCase().slice(-6)}-${Date.now()}`,
                ownerId: user.id,
                members: {
                  create: {
                    userId: user.id,
                    role: 'OWNER',
                  },
                },
              },
            });
          }
        }

        if (userWs) return userWs.id;
      }
    } catch (err) {
      console.warn('[Media] Error resolving user workspace from JWT:', err);
    }
  }

  try {
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
  } catch (error) {
    console.warn('[Workspace] Database unavailable during resolveWorkspaceId, using default workspace ID:', error);
    return 'default-workspace';
  }
}

function resolveAssetType(mimeType: string): AssetType {
  if (mimeType.startsWith('video/')) return 'VIDEO';
  if (mimeType.startsWith('image/')) return 'IMAGE';
  if (mimeType.startsWith('audio/')) return 'AUDIO';
  if (mimeType.includes('pdf')) return 'PDF';
  return 'IMAGE';
}

function serializeMediaAsset(asset: any, presignedUrl?: string) {
  let fileUrl = `/api/media/${asset.id}/file`;
  if (presignedUrl && !presignedUrl.includes('minio:9000')) {
    fileUrl = presignedUrl;
  }
  return {
    id: asset.id,
    workspaceId: asset.workspaceId,
    name: asset.name,
    assetType: asset.assetType,
    mimeType: asset.mimeType,
    fileSize: asset.fileSize ? Number(asset.fileSize) : 0,
    storagePath: asset.storagePath,
    url: fileUrl,
    metadata: asset.metadata,
    createdAt: asset.createdAt,
  };
}

// POST /api/media/upload
router.post('/upload', upload.single('file'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'File is required' });
      return;
    }

    const workspaceId = await resolveWorkspaceId(req);
    const mimeType = req.file.mimetype || 'application/octet-stream';
    const assetType = resolveAssetType(mimeType);

    // --- STRICT VPS STORAGE QUOTA ENFORCEMENT ---

    // 1. VIDEO: Unlimited files, Max 60 Minutes (3600s) Total Duration, Max 1080p resolution
    if (assetType === 'VIDEO') {
      const newDuration = req.body.duration ? Math.round(Number(req.body.duration)) : 0;

      // Calculate existing total video duration in this studio session / workspace
      const existingVideos = await prisma.mediaAsset.findMany({
        where: {
          workspaceId,
          assetType: 'VIDEO',
        },
        select: { metadata: true },
      });

      let currentTotalDuration = 0;
      for (const v of existingVideos) {
        const meta = (v.metadata as Record<string, any>) || {};
        currentTotalDuration += Number(meta.duration || 0);
      }

      const MAX_TOTAL_DURATION_SEC = 3600; // 60 minutes total
      if (currentTotalDuration + newDuration > MAX_TOTAL_DURATION_SEC) {
        const remainingSec = Math.max(0, MAX_TOTAL_DURATION_SEC - currentTotalDuration);
        const remMin = Math.floor(remainingSec / 60);
        const remSec = remainingSec % 60;
        const newMin = Math.floor(newDuration / 60);
        const newSec = newDuration % 60;
        res.status(400).json({
          success: false,
          error: `Total video duration limit (60 minutes) exceeded! Current total is ${Math.floor(currentTotalDuration / 60)}m. You only have ${remMin}m ${remSec}s remaining, but this video is ${newMin}m ${newSec}s. Please delete an existing video first.`,
        });
        return;
      }

      if (req.body.height && Number(req.body.height) > 1080) {
        res.status(400).json({
          success: false,
          error: 'Video resolution exceeds limit: Maximum 1080p resolution allowed.',
        });
        return;
      }
    }

    // 2. AUDIO: Max 2 audios, MP3 only, max 15 minutes (900s)
    if (assetType === 'AUDIO') {
      const isMp3 =
        mimeType === 'audio/mpeg' ||
        mimeType === 'audio/mp3' ||
        req.file.originalname.toLowerCase().endsWith('.mp3');
      if (!isMp3) {
        res.status(400).json({
          success: false,
          error: 'Format not allowed: Only MP3 audio files are permitted to save VPS storage.',
        });
        return;
      }
      const audioCount = await prisma.mediaAsset.count({
        where: { workspaceId, assetType: 'AUDIO' },
      });
      if (audioCount >= 2) {
        res.status(400).json({
          success: false,
          error: 'Audio quota exceeded: Maximum 2 audio files allowed in media library. Please delete an existing audio first.',
        });
        return;
      }
      if (req.body.duration && Number(req.body.duration) > 900) {
        res.status(400).json({
          success: false,
          error: 'Audio duration exceeds limit: Maximum 15 minutes (900 seconds) allowed.',
        });
        return;
      }
    }

    // 3. IMAGE / PDF: Max 2 files combined, max 2MB each
    if (assetType === 'IMAGE' || assetType === 'PDF') {
      const maxSizeBytes = 2 * 1024 * 1024; // 2 MB
      if (req.file.size > maxSizeBytes) {
        res.status(400).json({
          success: false,
          error: `File size exceeds limit: Maximum 2MB allowed for images and PDFs. Uploaded file is ${(req.file.size / (1024 * 1024)).toFixed(1)}MB.`,
        });
        return;
      }
      const docCount = await prisma.mediaAsset.count({
        where: {
          workspaceId,
          assetType: { in: ['IMAGE', 'PDF'] },
        },
      });
      if (docCount >= 2) {
        res.status(400).json({
          success: false,
          error: 'Image/PDF quota exceeded: Maximum 2 documents/images allowed. Please delete an existing file first.',
        });
        return;
      }
    }

    const rawStudioId = (req.body.studioId || req.body.sessionId || (req.headers['x-session-id'] as string) || '').trim();
    const studioId = rawStudioId || 'default';
    const cleanStudioId = studioId.replace(/^studio-/, '');

    const cleanFilename = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const localFileName = `${Date.now()}-${cleanFilename}`;
    const fullLocalPath = path.join(LOCAL_UPLOAD_DIR, localFileName);

    // Save directly to local disk storage (100% reliable, zero LiveKit data)
    await fs.promises.writeFile(fullLocalPath, req.file.buffer);

    const storageKey = `local://${localFileName}`;

    const mediaAsset = await prisma.mediaAsset.create({
      data: {
        workspaceId,
        name: req.body.name || req.file.originalname,
        assetType,
        mimeType,
        fileSize: BigInt(req.file.size),
        storagePath: storageKey,
        tags: ['temporary', `studio-${studioId}`, `studio-${cleanStudioId}`, `session-${studioId}`, `session-${cleanStudioId}`],
        metadata: {
          studioId,
          isTemporary: true,
          uploadedAt: Date.now(),
          duration: req.body.duration ? Number(req.body.duration) : undefined,
          width: req.body.width ? Number(req.body.width) : undefined,
          height: req.body.height ? Number(req.body.height) : undefined,
        },
      },
    });

    res.status(201).json({
      success: true,
      data: serializeMediaAsset(mediaAsset),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/media
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const studioId = ((req.query.studioId as string) || (req.headers['x-session-id'] as string) || '').trim();
    const cleanStudioId = studioId.replace(/^studio-/, '');

    const assets = await prisma.mediaAsset.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });

    // Filter: Include non-temporary (permanent) assets AND temporary assets matching this studio
    const filtered = assets.filter((asset) => {
      const tags = asset.tags || [];
      if (!tags.includes('temporary')) return true;
      if (!studioId) return true;
      return (
        tags.includes(`studio-${studioId}`) ||
        tags.includes(`studio-${cleanStudioId}`) ||
        tags.includes(`session-${studioId}`) ||
        tags.includes(`session-${cleanStudioId}`)
      );
    });

    const serialized = filtered.map((asset) => serializeMediaAsset(asset));
    res.status(200).json({ success: true, data: serialized });
  } catch (error) {
    next(error);
  }
});

// GET /api/media/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const asset = await prisma.mediaAsset.findUnique({
      where: { id: req.params.id },
    });

    if (!asset) {
      res.status(404).json({ success: false, error: 'Media asset not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: serializeMediaAsset(asset),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/media/:id/file (Stream file content directly to clients/guests with HTTP Range support)
router.get('/:id/file', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const asset = await prisma.mediaAsset.findUnique({
      where: { id: req.params.id },
    });

    if (!asset) {
      res.status(404).json({ success: false, error: 'Media asset not found' });
      return;
    }

    // 1. Check if stored on local disk
    if (asset.storagePath.startsWith('local://')) {
      const relPath = asset.storagePath.replace('local://', '');
      const fullPath = path.join(LOCAL_UPLOAD_DIR, relPath);

      if (!fs.existsSync(fullPath)) {
        res.status(404).json({ success: false, error: 'Local media file not found on disk' });
        return;
      }

      const stat = await fs.promises.stat(fullPath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (start >= fileSize || end >= fileSize) {
          res.status(416).setHeader('Content-Range', `bytes */${fileSize}`).end();
          return;
        }

        const chunkSize = end - start + 1;
        const fileStream = fs.createReadStream(fullPath, { start, end });

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': asset.mimeType || 'video/mp4',
        });
        fileStream.pipe(res);
        return;
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': asset.mimeType || 'video/mp4',
          'Accept-Ranges': 'bytes',
        });
        fs.createReadStream(fullPath).pipe(res);
        return;
      }
    }

    // 2. Otherwise stream from StorageService (MinIO)
    const fileRes = await storageService.getFileStream(asset.storagePath);
    if (!fileRes.success || !fileRes.data) {
      res.status(500).json({ success: false, error: 'Failed to retrieve media file stream' });
      return;
    }

    res.setHeader('Content-Type', fileRes.data.contentType || asset.mimeType);
    if (fileRes.data.contentLength) {
      res.setHeader('Content-Length', fileRes.data.contentLength);
    }
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    (fileRes.data.stream as any).pipe(res);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/media/session/:sessionId (Immediate purge of all temporary files for a studio session)
router.delete('/session/:sessionId', async (req: Request, res: Response): Promise<void> => {
  try {
    const count = await deleteSessionMedia(req.params.sessionId);
    res.status(200).json({ success: true, deletedCount: count });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// DELETE /api/media/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const asset = await prisma.mediaAsset.findUnique({
      where: { id: req.params.id },
    });

    if (asset) {
      if (asset.storagePath.startsWith('local://')) {
        const relPath = asset.storagePath.replace('local://', '');
        const fullLocalPath = path.join(LOCAL_UPLOAD_DIR, relPath);
        if (fs.existsSync(fullLocalPath)) {
          await fs.promises.unlink(fullLocalPath).catch(() => null);
        }
      } else {
        try {
          await storageService.deleteFile(asset.storagePath);
        } catch {}
      }

      await prisma.mediaAsset.delete({
        where: { id: req.params.id },
      });
    }

    res.status(200).json({ success: true, data: { id: req.params.id, deleted: true } });
  } catch (error) {
    next(error);
  }
});

export default router;
