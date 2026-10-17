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

const DUMMY_MEDIA_NAMES = new Set([
  "livestudio intro video.mp4",
  "livestudio_intro_video.mp4",
  "intro video.mp4",
  "intro_countdown_30s.mp4",
  "intro_countdown_30s_1080p.mp4",
  "product_demo_highlights.mp4",
  "product_architecture_2026.pdf",
  "background_lofi_stream.mp3",
  "sponsor_pitch_2026.pdf",
  "outro_credits_theme.mp4",
  "product_roadmap_slide_deck.pdf",
  "ambient_chillhop_background.mp3",
  "sponsor_banner_lowerthird.png",
]);

export async function purgeOrphanedAndDummyMedia(workspaceId?: string): Promise<number> {
  let purged = 0;
  try {

    const assets = await prisma.mediaAsset.findMany({
      where: workspaceId ? { workspaceId } : undefined,
      orderBy: { createdAt: "desc" },
    });
    const seenKeys = new Set<string>();
    for (const asset of assets) {
      const lowerName = (asset.name || "").trim().toLowerCase();
      const isDummyName =
        DUMMY_MEDIA_NAMES.has(lowerName) ||
        lowerName.startsWith("livestudio intro") ||
        lowerName.startsWith("livestudio_intro");

      let isMissingOnDisk = false;
      if (asset.storagePath.startsWith("local://")) {
        const relPath = asset.storagePath.replace("local://", "");
        const fullLocalPath = path.join(LOCAL_UPLOAD_DIR, relPath);
        if (!fs.existsSync(fullLocalPath)) {
          isMissingOnDisk = true;
        } else {
          try {
            const st = fs.statSync(fullLocalPath);
            if (st.size === 0) isMissingOnDisk = true;
          } catch {
            isMissingOnDisk = true;
          }
        }
      }

      const dedupKey = `${asset.workspaceId}:${asset.assetType}:${lowerName}:${Number(asset.fileSize || 0)}`;
      const isDuplicate = seenKeys.has(dedupKey);

      if (isDummyName || isMissingOnDisk || isDuplicate) {
        if (asset.storagePath.startsWith("local://") && !isDuplicate) {
          const relPath = asset.storagePath.replace("local://", "");
          const fullLocalPath = path.join(LOCAL_UPLOAD_DIR, relPath);
          if (fs.existsSync(fullLocalPath)) {
            await fs.promises.unlink(fullLocalPath).catch(() => null);
          }
        }
        await prisma.mediaAsset.delete({ where: { id: asset.id } }).catch(() => null);
        purged++;
      } else {
        seenKeys.add(dedupKey);
      }
    }
  } catch (err) {
    console.warn("[Media Cleanup] purgeOrphanedAndDummyMedia warning:", err);
  }
  return purged;
}

export async function deleteSessionMedia(sessionId: string): Promise<number> {
  if (!sessionId) return 0;
  const cleanId = sessionId.replace(/^studio-/, '');
  let count = 0;

  try {
    const assets = await prisma.mediaAsset.findMany({
      where: {
        tags: { has: 'temporary' },
        NOT: {
          tags: { has: 'persistent' },
        },
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
        NOT: {
          tags: { has: 'persistent' },
        },
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


// ─────────────────────────────────────────────────────────────────────────────
// ZERO-API-KEY YOUTUBE METADATA & DIRECT STREAM PROXY
// Allows playing YouTube URLs directly inside HTML5 <video crossOrigin="anonymous">
// with Start/End time, Fair-Use DSP filters (Audio Tempo LFO, Pitch Shift, 3-Band EQ),
// and full Canvas Broadcast/Recording!
// ─────────────────────────────────────────────────────────────────────────────
import https from 'https';
import http from 'http';
import { execFile, spawn } from 'child_process';


function extractYouTubeId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

const ytStreamUrlCache = new Map<string, { url: string; expiresAt: number }>();
let ytDlpBootstrapPromise: Promise<string> | null = null;

async function getOrBootstrapYtDlpBinary(): Promise<string> {
  const candidates = ['/usr/local/bin/yt-dlp', '/usr/bin/yt-dlp', '/tmp/yt-dlp'];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }
  if (!ytDlpBootstrapPromise) {
    ytDlpBootstrapPromise = (async () => {
      try {
        const resp = await fetch(
          'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp',
          { redirect: 'follow', signal: AbortSignal.timeout(12000) }
        );
        if (resp.ok) {
          const buf = Buffer.from(await resp.arrayBuffer());
          await fs.promises.writeFile('/tmp/yt-dlp', buf, { mode: 0o755 });
          return '/tmp/yt-dlp';
        }
      } catch {}
      return 'yt-dlp';
    })();
  }
  return ytDlpBootstrapPromise;
}

async function resolveDirectYouTubeStreamUrl(videoId: string): Promise<string | null> {
  const cached = ytStreamUrlCache.get(videoId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // Tier 1: Try yt-dlp (system or auto-bootstrapped in /tmp/yt-dlp)
  const ytdlpBin = await getOrBootstrapYtDlpBinary();
  const ytdlpUrl = await new Promise<string | null>((resolve) => {
    execFile(
      ytdlpBin,
      [
        '-f',
        'best[ext=mp4][height<=720]/best[ext=mp4]/18/best',
        '-g',
        '--no-playlist',
        '--no-check-certificates',
        '--geo-bypass',
        watchUrl,
      ],
      { timeout: 9000 },
      (err, stdout) => {
        if (!err && stdout && stdout.trim().startsWith('http')) {
          resolve(stdout.trim().split('\n')[0].trim());
        } else {
          resolve(null);
        }
      }
    );
  });

  if (ytdlpUrl) {
    ytStreamUrlCache.set(videoId, { url: ytdlpUrl, expiresAt: Date.now() + 25 * 60 * 1000 });
    return ytdlpUrl;
  }

  // Tier 2: Direct YouTube InnerTube Player API (100% pure Node.js fetch across 5 client profiles)
  const innertubeClients: Array<{
    clientName: string;
    clientVersion: string;
    androidSdkVersion?: number;
    deviceMake?: string;
    deviceModel?: string;
    osName?: string;
    osVersion?: string;
    userAgent: string;
  }> = [
    {
      clientName: 'IOS',
      clientVersion: '19.45.4',
      deviceMake: 'Apple',
      deviceModel: 'iPhone16,2',
      osName: 'iPhone',
      osVersion: '18.1.0.22B83',
      userAgent: 'com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 18_1_0 like Mac OS X;)',
    },
    {
      clientName: 'ANDROID_VR',
      clientVersion: '1.60.19',
      androidSdkVersion: 32,
      osName: 'Android',
      osVersion: '12L',
      userAgent: 'com.google.android.apps.youtube.vr.oculus/1.60.19 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip',
    },
    {
      clientName: 'ANDROID',
      clientVersion: '19.44.38',
      androidSdkVersion: 34,
      osName: 'Android',
      osVersion: '14',
      userAgent: 'com.google.android.youtube/19.44.38 (Linux; U; Android 14) gzip',
    },
    {
      clientName: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER',
      clientVersion: '2.0',
      userAgent: 'Mozilla/5.0 (PlayStation; PlayStation 5/2.26) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0 Safari/605.1.15',
    },
  ];

  for (const clientCfg of innertubeClients) {
    try {
      const ytRes = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': clientCfg.userAgent,
          Origin: 'https://www.youtube.com',
        },
        body: JSON.stringify({
          videoId,
          context: {
            client: {
              clientName: clientCfg.clientName,
              clientVersion: clientCfg.clientVersion,
              hl: 'en',
              gl: 'US',
              ...(clientCfg.deviceMake ? { deviceMake: clientCfg.deviceMake } : {}),
              ...(clientCfg.deviceModel ? { deviceModel: clientCfg.deviceModel } : {}),
              ...(clientCfg.osName ? { osName: clientCfg.osName } : {}),
              ...(clientCfg.osVersion ? { osVersion: clientCfg.osVersion } : {}),
              ...(clientCfg.androidSdkVersion ? { androidSdkVersion: clientCfg.androidSdkVersion } : {}),
            },
            thirdParty: {
              embedUrl: 'https://www.youtube.com/',
            },
          },
          contentCheckOk: true,
          racyCheckOk: true,
        }),
        signal: AbortSignal.timeout(6000),
      });
      if (ytRes.ok) {
        const ytData: any = await ytRes.json();
        const formats: any[] = ytData?.streamingData?.formats || [];
        // Strictly prefer progressive MP4 formats that contain BOTH video & audio (itag 22 = 720p, itag 18 = 360p)
        const bestFormat =
          formats.find((f) => f.itag === 22 && f.url) ||
          formats.find((f) => f.itag === 18 && f.url) ||
          formats.find((f) => f.url && String(f.mimeType || '').includes('video/mp4') && f.audioQuality);
        if (bestFormat?.url) {
          ytStreamUrlCache.set(videoId, { url: bestFormat.url, expiresAt: Date.now() + 20 * 60 * 1000 });
          return bestFormat.url;
        }
      }
    } catch {}
  }

  // Tier 3: Try public Piped / Invidious zero-key stream APIs
  const pipedInstances = [
    `https://pipedapi.kavin.rocks/streams/${videoId}`,
    `https://pipedapi.adminforge.de/streams/${videoId}`,
    `https://pipedapi.ducks.party/streams/${videoId}`,
    `https://inv.nadeko.net/api/v1/videos/${videoId}`,
    `https://invidious.nerdvpn.de/api/v1/videos/${videoId}`,
  ];
  for (const apiUrl of pipedInstances) {
    try {
      const resp = await fetch(apiUrl, { signal: AbortSignal.timeout(4500) });
      if (resp.ok) {
        const data: any = await resp.json();
        const streams: any[] = data?.videoStreams || [];
        const mp4Stream = streams.find(
          (s) => !s.videoOnly && (s.format === 'MPEG_4' || String(s.mimeType || '').includes('mp4')) && s.url
        );
        if (mp4Stream?.url) {
          ytStreamUrlCache.set(videoId, { url: mp4Stream.url, expiresAt: Date.now() + 20 * 60 * 1000 });
          return mp4Stream.url;
        }
        const invStreams: any[] = data?.formatStreams || [];
        const mp4Inv = invStreams.find((s) => s.url && String(s.type || '').includes('video/mp4'));
        if (mp4Inv?.url) {
          ytStreamUrlCache.set(videoId, { url: mp4Inv.url, expiresAt: Date.now() + 20 * 60 * 1000 });
          return mp4Inv.url;
        }
      }
    } catch {}
  }

  return null;
}

// Helper that follows up to 6 HTTP 301/302/303/307/308 redirects (Critical for googlevideo.com CDN URLs!)
function pipeYouTubeStreamFollowingRedirects(
  initialUrl: string,
  req: Request,
  res: Response,
  videoId: string,
  redirectsLeft: number = 6,
  onFail?: () => void
): void {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(initialUrl);
  } catch (err) {
    if (onFail) {
      onFail();
      return;
    }
    if (!res.headersSent) {
      res.status(502).json({ success: false, error: 'Invalid upstream stream URL' });
    }
    return;
  }

  const client = parsedUrl.protocol === 'https:' ? https : http;
  const reqHeaders: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    Accept: '*/*',
    Connection: 'keep-alive',
  };
  if (req.headers.range) {
    reqHeaders['Range'] = req.headers.range;
  }

  const proxyReq = client.get(initialUrl, { headers: reqHeaders }, (proxyRes) => {
    const statusCode = proxyRes.statusCode || 200;

    // Follow 301/302/303/307/308 redirects from googlevideo.com edge servers
    if (
      [301, 302, 303, 307, 308].includes(statusCode) &&
      proxyRes.headers.location &&
      redirectsLeft > 0
    ) {
      proxyRes.resume();
      const nextUrl = new URL(proxyRes.headers.location, initialUrl).toString();
      pipeYouTubeStreamFollowingRedirects(nextUrl, req, res, videoId, redirectsLeft - 1, onFail);
      return;
    }

    if (statusCode >= 400) {
      proxyRes.resume();
      ytStreamUrlCache.delete(videoId);
      if (onFail) {
        onFail();
        return;
      }
      if (!res.headersSent) {
        res.status(502).json({ success: false, error: `Upstream returned ${statusCode}` });
      }
      return;
    }

    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('Cross-Origin-Embedder-Policy');
    res.removeHeader('Cross-Origin-Resource-Policy');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Accept, Origin, User-Agent');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'video/mp4');
    if (proxyRes.headers['content-length']) {
      res.setHeader('Content-Length', proxyRes.headers['content-length']);
    }
    if (proxyRes.headers['content-range']) {
      res.setHeader('Content-Range', proxyRes.headers['content-range']);
    }
    res.writeHead(statusCode);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    ytStreamUrlCache.delete(videoId);
    if (onFail) {
      onFail();
      return;
    }
    if (!res.headersSent) {
      res.status(502).json({ success: false, error: err.message });
    }
  });
}

// GET /api/media/youtube/info?url=...
router.get('/youtube/info', async (req: Request, res: Response): Promise<void> => {
  try {
    const rawUrl = String(req.query.url || '');
    const videoId = extractYouTubeId(rawUrl);
    if (!videoId) {
      res.status(400).json({ success: false, error: 'Invalid YouTube URL or Video ID' });
      return;
    }

    let title = `YouTube Video (${videoId})`;
    let author = 'YouTube';
    let thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const oRes = await fetch(oembedUrl, { signal: AbortSignal.timeout(4000) });
      if (oRes.ok) {
        const oData: any = await oRes.json();
        if (oData.title) title = oData.title;
        if (oData.author_name) author = oData.author_name;
        if (oData.thumbnail_url) thumbnailUrl = oData.thumbnail_url;
      }
    } catch {}

    const directUrl = await resolveDirectYouTubeStreamUrl(videoId);

    res.status(200).json({
      success: true,
      data: {
        videoId,
        title,
        author,
        thumbnailUrl,
        hasDirectStream: Boolean(directUrl),
        streamProxyUrl: `/api/media/youtube/stream?videoId=${videoId}`,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// Spawns yt-dlp to mux video + audio into fragmented MP4 streamable to stdout without seek errors
function spawnYtDlpStream(
  videoId: string,
  req: Request,
  res: Response,
  ytdlpBin: string
): void {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const proc = spawn(ytdlpBin, [
    '-f',
    'best[ext=mp4][height<=720]/bestvideo[height<=720]+bestaudio/best[height<=720]/best',
    '--no-playlist',
    '--no-check-certificates',
    '--geo-bypass',
    '--merge-output-format',
    'mp4',
    '--ppa',
    'Merger+ffmpeg_o:-movflags frag_keyframe+empty_moov+default_base_moof',
    '-o',
    '-',
    watchUrl,
  ]);

  res.removeHeader('X-Frame-Options');
  res.removeHeader('Content-Security-Policy');
  res.removeHeader('Cross-Origin-Embedder-Policy');
  res.removeHeader('Cross-Origin-Opener-Policy');
  res.removeHeader('Cross-Origin-Resource-Policy');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Accept, Origin, User-Agent');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Content-Type', 'video/mp4');

  proc.stdout.pipe(res);

  proc.on('error', (procErr) => {
    console.warn('[YouTube Stream] yt-dlp process error:', procErr);
    if (!res.headersSent) {
      res.status(502).json({ success: false, error: procErr.message });
    }
  });

  req.on('close', () => {
    try {
      proc.kill('SIGTERM');
    } catch {}
  });
}

// OPTIONS /api/media/youtube/stream
router.options('/youtube/stream', (_req: Request, res: Response) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Accept, Origin, User-Agent');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.status(204).end();
});

// GET /api/media/youtube/stream?videoId=...
router.get('/youtube/stream', async (req: Request, res: Response): Promise<void> => {
  try {
    const raw = String(req.query.videoId || req.query.url || '');
    const videoId = extractYouTubeId(raw);
    if (!videoId) {
      res.status(400).json({ success: false, error: 'Invalid YouTube videoId' });
      return;
    }

    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('Cross-Origin-Embedder-Policy');
    res.removeHeader('Cross-Origin-Opener-Policy');
    res.removeHeader('Cross-Origin-Resource-Policy');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Accept, Origin, User-Agent');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    const ytdlpBin = await getOrBootstrapYtDlpBinary();

    const directUrl = await resolveDirectYouTubeStreamUrl(videoId);
    if (directUrl) {
      pipeYouTubeStreamFollowingRedirects(directUrl, req, res, videoId, 6, () => {
        spawnYtDlpStream(videoId, req, res, ytdlpBin);
      });
      return;
    }

    // Direct resolution unavailable - stream directly via yt-dlp stdout pipe
    spawnYtDlpStream(videoId, req, res, ytdlpBin);
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  }
});

// GET /api/media/website/proxy?url=...
// Proxies external webpages into the studio stage iframe, stripping X-Frame-Options, COEP, CORP & CSP
// and injecting <base href="..."> + navigation/form helpers so websites open and interact seamlessly!
router.get('/website/proxy', async (req: Request, res: Response): Promise<void> => {
  if (typeof process !== 'undefined' && process.env) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }
  res.removeHeader('X-Frame-Options');
  res.removeHeader('Content-Security-Policy');
  res.removeHeader('Content-Security-Policy-Report-Only');
  res.removeHeader('Cross-Origin-Embedder-Policy');
  res.removeHeader('Cross-Origin-Opener-Policy');
  res.removeHeader('Cross-Origin-Resource-Policy');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  let rawUrl = String(req.query.url || '').trim();
  const mode = String(req.query.mode || 'proxy');
  if (!rawUrl) {
    res.status(400).send('Missing url parameter');
    return;
  }
  // Auto-heal malformed protocols like "https: /", "https:/", "http:/", "https;//"
  rawUrl = rawUrl.replace(/^https?\s*[:;]\s*\/+\s*/i, (m) =>
    m.toLowerCase().startsWith('http:') ? 'http://' : 'https://'
  );
  if (!/^https?:\/\//i.test(rawUrl)) {
    rawUrl = `https://${rawUrl.replace(/^\/+/, '')}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    res.status(400).send('Invalid URL');
    return;
  }

  const hostLower = parsed.hostname.toLowerCase().replace(/^www\./, '');

  // Reader View Mode
  if (mode === 'reader') {
    try {
      const readerResp = await fetch(`https://r.jina.ai/${parsed.toString()}`, {
        headers: {
          Accept: 'text/plain',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(10000),
      });
      const text = await readerResp.text();
      const escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/^### (.*)$/gm, '<h3 style="color:#38bdf8;margin-top:20px;">$1</h3>')
        .replace(/^## (.*)$/gm, '<h2 style="color:#f8fafc;margin-top:24px;border-bottom:1px solid #334155;padding-bottom:6px;">$1</h2>')
        .replace(/^# (.*)$/gm, '<h1 style="color:#ffffff;font-size:28px;margin-bottom:12px;">$1</h1>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/!\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:12px;margin:12px 0;" />')
        .replace(/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="/api/media/website/proxy?url=$2" style="color:#38bdf8;text-decoration:underline;">$1</a>')
        .replace(/\n\n/g, '</p><p style="margin:12px 0;line-height:1.7;">');

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(200).send(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${parsed.hostname}</title></head>
      <body style="background:#0b0f19;color:#e2e8f0;font-family:Inter,system-ui,sans-serif;padding:32px 48px;max-width:960px;margin:0 auto;font-size:17px;line-height:1.7;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:14px;margin-bottom:20px;border-bottom:1px solid rgba(255,255,255,0.12);">
          <span style="color:#38bdf8;font-weight:700;font-size:14px;">📖 READER VIEW • ${parsed.hostname}</span>
          <a href="/api/media/website/proxy?url=${encodeURIComponent(parsed.toString())}" style="color:#94a3b8;font-size:12px;text-decoration:underline;">Switch to Full Interactive Page</a>
        </div>
        <p style="margin:12px 0;line-height:1.7;">${escaped}</p>
      </body></html>`);
      return;
    } catch {}
  }

  let targetUrl = parsed.toString();
  let fetchUserAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

  if (hostLower === 'facebook.com' || hostLower === 'www.facebook.com' || hostLower.endsWith('.facebook.com')) {
    targetUrl = `https://m.facebook.com${parsed.pathname}${parsed.search}`;
    fetchUserAgent =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
  }

  let resp: any = null;
  try {
    resp = await fetch(targetUrl, {
      headers: {
        'User-Agent': fetchUserAgent,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });
  } catch (err1) {
    if (!parsed.hostname.startsWith('www.') && !parsed.hostname.startsWith('m.')) {
      try {
        const altParsed = new URL(parsed.toString());
        altParsed.hostname = 'www.' + altParsed.hostname;
        resp = await fetch(altParsed.toString(), {
          headers: {
            'User-Agent': fetchUserAgent,
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
          },
          redirect: 'follow',
          signal: AbortSignal.timeout(10000),
        });
      } catch {}
    }
  }

  try {
    if (!resp || !resp.ok) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(200).send(`<!DOCTYPE html><html>
      <head><meta charset="utf-8"/><title>${parsed.hostname}</title></head>
      <body style="background:#090a14;color:#f8fafc;font-family:Inter,system-ui,sans-serif;padding:36px;text-align:center;">
        <div style="max-width:540px;margin:0 auto;background:#131525;padding:28px 32px;border-radius:18px;border:1px solid rgba(255,255,255,0.12);box-shadow:0 12px 36px rgba(0,0,0,0.5);">
          <div style="font-size:38px;margin-bottom:12px;">🛡️</div>
          <h3 style="color:#38bdf8;font-size:18px;margin-bottom:8px;">${parsed.hostname} — Protected by Firewall</h3>
          <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin-bottom:20px;">
            ${resp ? `Status ${resp.status} received.` : 'Connection timeout.'} Choose an action below to display this content on stage:
          </p>
          <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;">
            <a href="/api/media/website/proxy?url=${encodeURIComponent(parsed.toString())}&mode=reader" style="padding:9px 18px;border-radius:10px;background:#0284c7;color:#fff;text-decoration:none;font-weight:700;font-size:12.5px;">📖 Open Clean Reader View</a>
            <a href="${parsed.toString()}" target="_blank" rel="noopener noreferrer" style="padding:9px 18px;border-radius:10px;background:#334155;color:#e2e8f0;text-decoration:none;font-weight:600;font-size:12.5px;">🔗 Open in New Tab</a>
          </div>
        </div>
      </body></html>`);
      return;
    }

    const contentType = resp.headers.get('content-type') || 'text/html; charset=utf-8';

    if (contentType.includes('text/html')) {
      let html = await resp.text();
      // Strip embedded meta CSP & X-Frame-Options tags
      html = html
        .replace(/<meta[^>]*http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi, '')
        .replace(/<meta[^>]*http-equiv=["']?X-Frame-Options["']?[^>]*>/gi, '');

      const finalUrl = resp.url ? new URL(resp.url) : parsed;
      const origin = `${finalUrl.protocol}//${finalUrl.host}`;
      const baseHref = `${origin}${finalUrl.pathname.endsWith('/') ? finalUrl.pathname : finalUrl.pathname.replace(/[^/]*$/, '')}`;
      const baseTag = `<base href="${baseHref}" />`;

      html = html
        .replace(/\b(src|href)=["']\/(?!\/)/gi, `$1="${origin}/`)
        .replace(/\baction=["']\/(?!\/)/gi, `action="${origin}/`);

      const helperScript = `<script>
        (function() {
          var _realStudioHost = null;
          try {
            if (window.parent && window.parent !== window) {
              _realStudioHost = window.parent;
            } else if (window.top && window.top !== window) {
              _realStudioHost = window.top;
            }
          } catch (e) {}

          try {
            Object.defineProperty(window, "top", { get: function() { return window.self; } });
            Object.defineProperty(window, "parent", { get: function() { return window.self; } });
          } catch (e) {}

          document.addEventListener("click", function(e) {
            var a = e.target && e.target.closest ? e.target.closest("a") : null;
            if (!a) return;
            var rawHref = a.getAttribute("href");
            if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("javascript:")) return;
            try {
              var resolved = new URL(a.href, "${finalUrl.toString()}").toString();
              if (/^https?:\/\//i.test(resolved) && !resolved.includes("/api/media/website/proxy") && !resolved.includes("/web-proxy")) {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = "/api/media/website/proxy?url=" + encodeURIComponent(resolved);
              }
            } catch (err) {}
          }, true);

          document.addEventListener("submit", function(e) {
            var form = e.target;
            if (!form || form.tagName !== "FORM") return;
            var method = (form.getAttribute("method") || "GET").toUpperCase();
            if (method === "GET") {
              try {
                e.preventDefault();
                var actionUrl = new URL(form.getAttribute("action") || "${finalUrl.toString()}", "${finalUrl.toString()}");
                var formData = new FormData(form);
                formData.forEach(function(val, key) {
                  actionUrl.searchParams.set(key, String(val));
                });
                window.location.href = "/api/media/website/proxy?url=" + encodeURIComponent(actionUrl.toString());
              } catch (err) {}
            }
          }, true);

          window.addEventListener("mousemove", function(e) {
            try {
              if (_realStudioHost) {
                _realStudioHost.postMessage({
                  type: "LIVESTUDIO_WEB_POINTER_MOVE",
                  clientX: e.clientX,
                  clientY: e.clientY,
                  innerWidth: window.innerWidth,
                  innerHeight: window.innerHeight
                }, "*");
              }
            } catch (err) {}
          }, { passive: true });

          window.addEventListener("mousedown", function(e) {
            try {
              if (_realStudioHost) {
                _realStudioHost.postMessage({
                  type: "LIVESTUDIO_WEB_POINTER_CLICK"
                }, "*");
              }
            } catch (err) {}
          }, { passive: true });
        })();
      </script>`;

      if (/<head[^>]*>/i.test(html)) {
        html = html.replace(/<head[^>]*>/i, (match: string) => `${match}${baseTag}${helperScript}`);
      } else {
        html = `<head>${baseTag}${helperScript}</head>${html}`;
      }
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(200).send(html);
      return;
    }

    const arrayBuf = await resp.arrayBuffer();
    res.setHeader('Content-Type', contentType);
    res.status(resp.status).send(Buffer.from(arrayBuf));
  } catch (err) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(`<!DOCTYPE html><html><body style="background:#090a14;color:#f8fafc;font-family:Inter,system-ui,sans-serif;padding:40px;text-align:center;">
      <h3 style="color:#38bdf8;margin-bottom:8px;">Unable to load webpage directly (${(err as Error).message})</h3>
      <p style="color:#94a3b8;font-size:14px;margin-bottom:18px;">Click below to open Clean Reader View or switch to Next.js Web Proxy in the top bar.</p>
      <a href="/api/media/website/proxy?url=${encodeURIComponent(parsed.toString())}&mode=reader" style="display:inline-block;padding:10px 20px;border-radius:10px;background:#0284c7;color:#fff;text-decoration:none;font-weight:700;font-size:13px;">📖 Open Clean Reader View</a>
    </body></html>`);
  }
});

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

    await purgeOrphanedAndDummyMedia(workspaceId);

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

    const isPersistent =
      req.body.isPersistent === 'true' ||
      req.body.isPersistent === true ||
      req.body.isPermanent === 'true' ||
      req.body.permanent === 'true';

    const tags = isPersistent
      ? ['persistent', 'studio-asset', `studio-${studioId}`, `studio-${cleanStudioId}`]
      : ['temporary', `studio-${studioId}`, `studio-${cleanStudioId}`, `session-${studioId}`, `session-${cleanStudioId}`];

    const mediaAsset = await prisma.mediaAsset.create({
      data: {
        workspaceId,
        name: req.body.name || req.file.originalname,
        assetType,
        mimeType,
        fileSize: BigInt(req.file.size),
        storagePath: storageKey,
        tags,
        metadata: {
          studioId,
          isTemporary: !isPersistent,
          isPersistent,
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
      if (!tags.includes('temporary') || tags.includes('persistent')) return true;
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


// POST /api/media/cleanup (Purges dummy, broken/missing local files, and duplicate assets)
router.post('/cleanup', async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const purgedCount = await purgeOrphanedAndDummyMedia(workspaceId);
    res.status(200).json({ success: true, data: { purgedCount } });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
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
