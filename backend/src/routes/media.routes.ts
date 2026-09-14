import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { prisma } from '../lib/prisma';
import { StorageService } from '../services/storage.service';
import { AssetType } from '@prisma/client';

const router = Router();
const storageService = new StorageService();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
});

async function resolveWorkspaceId(req: Request): Promise<string> {
  const reqWsId = (req.headers['x-workspace-id'] as string) || (req.body?.workspaceId as string);
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

    // 1. VIDEO: Max 2 videos, max 10 minutes (600s), max 1080p resolution
    if (assetType === 'VIDEO') {
      const videoCount = await prisma.mediaAsset.count({
        where: { workspaceId, assetType: 'VIDEO' },
      });
      if (videoCount >= 2) {
        res.status(400).json({
          success: false,
          error: 'Video quota exceeded: Maximum 2 videos allowed in media library to preserve VPS storage. Please delete an existing video first.',
        });
        return;
      }
      if (req.body.duration && Number(req.body.duration) > 600) {
        res.status(400).json({
          success: false,
          error: 'Video duration exceeds limit: Maximum 10 minutes (600 seconds) allowed.',
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

    const cleanFilename = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `media/${workspaceId}/${Date.now()}-${cleanFilename}`;

    const uploadRes = await storageService.uploadFile({
      key: storageKey,
      contentType: mimeType,
      body: req.file.buffer,
    });

    if (!uploadRes.success) {
      res.status(500).json({ success: false, error: uploadRes.error || 'Upload to storage failed' });
      return;
    }

    const mediaAsset = await prisma.mediaAsset.create({
      data: {
        workspaceId,
        name: req.body.name || req.file.originalname,
        assetType,
        mimeType,
        fileSize: BigInt(req.file.size),
        storagePath: storageKey,
        metadata: {
          duration: req.body.duration ? Number(req.body.duration) : undefined,
          width: req.body.width ? Number(req.body.width) : undefined,
          height: req.body.height ? Number(req.body.height) : undefined,
        },
      },
    });

    const urlRes = await storageService.getPresignedUrl(storageKey, undefined, 86400);

    res.status(201).json({
      success: true,
      data: serializeMediaAsset(mediaAsset, urlRes.success ? urlRes.data : undefined),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/media
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const assets = await prisma.mediaAsset.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });

    const serialized = await Promise.all(
      assets.map(async (asset) => {
        let presignedUrl = '';
        try {
          const urlRes = await storageService.getPresignedUrl(asset.storagePath, undefined, 86400);
          if (urlRes.success && urlRes.data) presignedUrl = urlRes.data;
        } catch {
          // ignore presigned error
        }
        return serializeMediaAsset(asset, presignedUrl);
      })
    );

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

    const urlRes = await storageService.getPresignedUrl(asset.storagePath, undefined, 86400);
    res.status(200).json({
      success: true,
      data: serializeMediaAsset(asset, urlRes.success ? urlRes.data : undefined),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/media/:id/file (Stream file content directly to clients/guests)
router.get('/:id/file', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const asset = await prisma.mediaAsset.findUnique({
      where: { id: req.params.id },
    });

    if (!asset) {
      res.status(404).json({ success: false, error: 'Media asset not found' });
      return;
    }

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

// DELETE /api/media/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const asset = await prisma.mediaAsset.findUnique({
      where: { id: req.params.id },
    });

    if (asset) {
      try {
        await storageService.deleteFile(asset.storagePath);
      } catch {
        // ignore
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
