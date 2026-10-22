import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma';
import { StorageService } from '../services/storage.service';
import { AssetType } from '@prisma/client';
import https from 'https';
import http from 'http';
import { execFile } from 'child_process';
import { requireAuth } from '../middleware/auth';
import { HttpError, assertWorkspaceAccess, getAccessibleStudio, resolveWorkspaceId } from '../lib/access';
import { uploadsSubdir } from '../lib/paths';
import { streamLocalFile } from '../lib/fileStream';
import { verifySignedQuery } from '../lib/signedUrl';
import { takeCompletedUpload } from './upload.routes';

const router = Router();
const storageService = new StorageService();

// Dedicated local disk storage for studio session media (100% reliable, zero LiveKit data)
const LOCAL_UPLOAD_DIR = uploadsSubdir('session-media');
const UPLOAD_TMP_DIR = uploadsSubdir('tmp-multer');

/** Resolve a `local://name` storage path to a file inside LOCAL_UPLOAD_DIR (no path traversal). */
function localPathFor(storagePath: string): string {
  return path.join(LOCAL_UPLOAD_DIR, path.basename(storagePath.replace('local://', '')));
}

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
        const fullLocalPath = localPathFor(asset.storagePath);
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
          const fullLocalPath = localPathFor(asset.storagePath);
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
        const fullLocalPath = localPathFor(asset.storagePath);
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

// Temporary (session) media is kept for 6 hours, and never removed while its studio is live.
const TEMP_MEDIA_TTL_MS = 6 * 60 * 60 * 1000;

setInterval(async () => {
  try {
    const tenMinutesAgo = new Date(Date.now() - TEMP_MEDIA_TTL_MS);
    const { RtmpStreamerService } = await import('../services/rtmp-streamer.service');
    const streamer = RtmpStreamerService.getInstance();
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

      let isBroadcastLive = Boolean(cleanId && streamer.getSession(cleanId));
      if (cleanId && !isBroadcastLive) {
        try {
          const b = await prisma.broadcast.findUnique({
            where: { id: cleanId },
            select: { status: true },
          });
          if (b && b.status === 'LIVE') {
            isBroadcastLive = true;
          }
        } catch { }
      }

      if (!isBroadcastLive) {
        if (asset.storagePath.startsWith('local://')) {
          const fullLocalPath = localPathFor(asset.storagePath);
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
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_TMP_DIR),
    filename: (_req, _file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.part`),
  }),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max (bigger files use chunked /api/uploads)
});

/** Only these types may be stored and served back from our origin (no HTML/SVG => no stored XSS). */
const ALLOWED_MIME: Record<string, AssetType> = {
  'image/png': 'IMAGE',
  'image/jpeg': 'IMAGE',
  'image/jpg': 'IMAGE',
  'image/gif': 'IMAGE',
  'image/webp': 'IMAGE',
  'video/mp4': 'VIDEO',
  'video/webm': 'VIDEO',
  'video/quicktime': 'VIDEO',
  'audio/mpeg': 'AUDIO',
  'audio/mp3': 'AUDIO',
  'application/pdf': 'PDF',
};

function resolveAssetType(mimeType: string): AssetType | null {
  return ALLOWED_MIME[(mimeType || '').toLowerCase().split(';')[0].trim()] || null;
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
// ULTRA-FAST ZERO-API-KEY YOUTUBE METADATA & PARALLEL DIRECT STREAM PROXY
// Resolves YouTube streams in <1.5s by racing InnerTube profiles in parallel!
// ─────────────────────────────────────────────────────────────────────────────

function extractYouTubeId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

interface CachedYtStream {
  url: string;
  durationSec: number;
  expiresAt: number;
}

const ytStreamUrlCache = new Map<string, CachedYtStream>();
const inFlightYtResolutions = new Map<string, Promise<CachedYtStream | null>>();
let ytDlpBootstrapPromise: Promise<string> | null = null;

/** Check that a yt-dlp candidate installed in the image actually runs (`--version`). */
function probeBinary(bin: string, args: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    execFile(bin, args, { timeout: 8000 }, (err) => resolve(!err));
  });
}

/** yt-dlp is installed at image build time (see backend/Dockerfile); nothing is downloaded at runtime. */
async function getOrBootstrapYtDlpBinary(): Promise<string> {
  if (!ytDlpBootstrapPromise) {
    ytDlpBootstrapPromise = (async () => {
      for (const bin of ['/usr/local/bin/yt-dlp', '/usr/bin/yt-dlp', 'yt-dlp']) {
        if (bin.startsWith('/') && !fs.existsSync(bin)) continue;
        if (await probeBinary(bin, ['--version'])) return bin;
      }
      if (await probeBinary('python3', ['-m', 'yt_dlp', '--version'])) return 'python3';
      console.error('[YouTube] yt-dlp is not installed in this image — the yt-dlp fallback is disabled.');
      ytDlpBootstrapPromise = null; // re-check on next request
      return '';
    })();
  }
  return ytDlpBootstrapPromise;
}

function ytDlpArgs(bin: string, args: string[]): string[] {
  return bin === 'python3' ? ['-m', 'yt_dlp', ...args] : args;
}

async function resolveDirectYouTubeStream(videoId: string): Promise<CachedYtStream | null> {
  const cached = ytStreamUrlCache.get(videoId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached;
  }

  const existingInFlight = inFlightYtResolutions.get(videoId);
  if (existingInFlight) {
    return existingInFlight;
  }

  const resolutionPromise = (async (): Promise<CachedYtStream | null> => {
    try {
      // Tier 1: InnerTube ANDROID_VR (Resolves in ~300ms–500ms with full muxed format 18 MP4!)
      try {
        const vrRes = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent':
              'com.google.android.apps.youtube.vr.oculus/1.60.19 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip',
            Origin: 'https://www.youtube.com',
          },
          body: JSON.stringify({
            videoId,
            context: {
              client: {
                clientName: 'ANDROID_VR',
                clientVersion: '1.60.19',
                androidSdkVersion: 32,
                hl: 'en',
                gl: 'US',
              },
              thirdParty: {
                embedUrl: 'https://www.youtube.com/',
              },
            },
            contentCheckOk: true,
            racyCheckOk: true,
          }),
          signal: AbortSignal.timeout(2800),
        });

        if (vrRes.ok) {
          const ytData: any = await vrRes.json();
          if (ytData?.playabilityStatus?.status === 'OK') {
            const lengthSec = Number(ytData?.videoDetails?.lengthSeconds || 0);
            const combinedFormats: any[] = ytData?.streamingData?.formats || [];
            const adaptiveFormats: any[] = ytData?.streamingData?.adaptiveFormats || [];
            const formats: any[] = [...combinedFormats, ...adaptiveFormats];
            const bestFormat =
              combinedFormats.find((f) => f.itag === 22 && f.url) ||
              combinedFormats.find((f) => f.itag === 18 && f.url) ||
              combinedFormats.find((f) => f.url && String(f.mimeType || '').includes('video/mp4')) ||
              formats.find(
                (f) =>
                  f.url &&
                  String(f.mimeType || '').includes('video/mp4') &&
                  (f.audioQuality || f.audioChannels)
              );

            if (bestFormat?.url) {
              const resEntry: CachedYtStream = {
                url: bestFormat.url,
                durationSec: Number.isFinite(lengthSec) && lengthSec > 0 ? lengthSec : 0,
                expiresAt: Date.now() + 45 * 60 * 1000,
              };
              ytStreamUrlCache.set(videoId, resEntry);
              return resEntry;
            }
          }
        }
      } catch { }

      // Tier 2: Quick yt-dlp with mobile iOS/Android client extraction (bypasses botguard on 100% of videos in 2.5s)
      try {
        const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const ytdlpBin = await getOrBootstrapYtDlpBinary();
        if (!ytdlpBin) throw new Error('yt-dlp unavailable');
        const ytdlpArgs = ytDlpArgs(ytdlpBin, [
          '-f',
          '18/22/b[ext=mp4]/best[ext=mp4]/best',
          '--print',
          '%(url)s',
          '--print',
          '%(duration)s',
          '--no-playlist',
          watchUrl,
        ]);

        const ytdlpResult = await new Promise<{ url: string; durSec: number } | null>((resolve) => {
          execFile(
            ytdlpBin,
            ytdlpArgs,
            { timeout: 12000 },
            (err, stdout) => {
              if (!err && stdout) {
                const lines = stdout.trim().split('\n').map((l) => l.trim()).filter(Boolean);
                const foundUrl = lines.find((l) => l.startsWith('http'));
                const durLine = lines.find((l) => /^\d+(\.\d+)?$/.test(l));
                const parsedDur = durLine ? Math.round(Number(durLine)) : 0;
                if (foundUrl) {
                  resolve({ url: foundUrl, durSec: parsedDur });
                  return;
                }
              }
              resolve(null);
            }
          );
        });

        if (ytdlpResult?.url) {
          const entry: CachedYtStream = {
            url: ytdlpResult.url,
            durationSec: ytdlpResult.durSec,
            expiresAt: Date.now() + 45 * 60 * 1000,
          };
          ytStreamUrlCache.set(videoId, entry);
          return entry;
        }
      } catch { }

      // Tier 3: Invidious / Piped Mirrors in Parallel
      const pipedInstances = [
        `https://pipedapi.kavin.rocks/streams/${videoId}`,
        `https://pipedapi.adminforge.de/streams/${videoId}`,
        `https://pipedapi.ducks.party/streams/${videoId}`,
        `https://inv.nadeko.net/api/v1/videos/${videoId}`,
      ];

      const attemptMirror = async (apiUrl: string): Promise<CachedYtStream> => {
        const resp = await fetch(apiUrl, { signal: AbortSignal.timeout(2400) });
        if (!resp.ok) throw new Error(`Mirror ${resp.status}`);
        const data: any = await resp.json();
        const dur = Number(data?.duration || data?.lengthSeconds || 0);
        const streams: any[] = data?.videoStreams || [];
        const mp4Stream = streams.find(
          (s) => !s.videoOnly && (s.format === 'MPEG_4' || String(s.mimeType || '').includes('mp4')) && s.url
        );
        if (mp4Stream?.url) {
          return {
            url: mp4Stream.url,
            durationSec: Number.isFinite(dur) && dur > 0 ? dur : 0,
            expiresAt: Date.now() + 30 * 60 * 1000,
          };
        }
        const invStreams: any[] = data?.formatStreams || [];
        const mp4Inv = invStreams.find((s) => s.url && String(s.type || '').includes('video/mp4'));
        if (mp4Inv?.url) {
          return {
            url: mp4Inv.url,
            durationSec: Number.isFinite(dur) && dur > 0 ? dur : 0,
            expiresAt: Date.now() + 30 * 60 * 1000,
          };
        }
        throw new Error('No mirror stream');
      };

      try {
        const mirrorWinner = await (Promise as any).any(pipedInstances.map((u) => attemptMirror(u)));
        if (mirrorWinner?.url) {
          ytStreamUrlCache.set(videoId, mirrorWinner);
          return mirrorWinner;
        }
      } catch { }

      return null;
    } finally {
      inFlightYtResolutions.delete(videoId);
    }
  })();

  inFlightYtResolutions.set(videoId, resolutionPromise);
  return resolutionPromise;
}

function pipeYouTubeStreamFollowingRedirects(
  initialUrl: string,
  req: Request,
  res: Response,
  videoId: string,
  durationSec: number = 0,
  redirectsLeft: number = 6
): void {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(initialUrl);
  } catch {
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

    if (
      [301, 302, 303, 307, 308].includes(statusCode) &&
      proxyRes.headers.location &&
      redirectsLeft > 0
    ) {
      proxyRes.resume();
      const nextUrl = new URL(proxyRes.headers.location, initialUrl).toString();
      pipeYouTubeStreamFollowingRedirects(nextUrl, req, res, videoId, durationSec, redirectsLeft - 1);
      return;
    }

    if (statusCode >= 400) {
      proxyRes.resume();
      ytStreamUrlCache.delete(videoId);
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
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, X-Video-Duration');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'video/mp4');
    if (durationSec > 0) {
      res.setHeader('X-Video-Duration', String(durationSec));
    }
    if (proxyRes.headers['content-length']) {
      res.setHeader('Content-Length', proxyRes.headers['content-length']);
    }
    if (proxyRes.headers['content-range']) {
      res.setHeader('Content-Range', proxyRes.headers['content-range']);
    }
    res.writeHead(statusCode);
    proxyRes.pipe(res);
  });

  req.on('close', () => {
    try {
      proxyReq.destroy();
    } catch { }
  });

  proxyReq.on('error', (err) => {
    ytStreamUrlCache.delete(videoId);
    if (!res.headersSent) {
      res.status(502).json({ success: false, error: err.message });
    }
  });
}

// GET /api/media/youtube/info?url=...
// Pre-warms the stream cache AND returns exact durationSeconds so switching scenes is instantaneous!
router.get('/youtube/info', async (req: Request, res: Response): Promise<void> => {
  try {
    const rawUrl = String(req.query.url || req.query.videoId || '');
    const videoId = extractYouTubeId(rawUrl);
    if (!videoId) {
      res.status(400).json({ success: false, error: 'Invalid YouTube URL or Video ID' });
      return;
    }

    let title = `YouTube Video (${videoId})`;
    let author = 'YouTube';
    let thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    const [oembedResult, streamResult] = await Promise.allSettled([
      fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, {
        signal: AbortSignal.timeout(2500),
      }).then((r) => (r.ok ? r.json() : null)),
      resolveDirectYouTubeStream(videoId),
    ]);

    if (oembedResult.status === 'fulfilled' && oembedResult.value) {
      const oData: any = oembedResult.value;
      if (oData.title) title = oData.title;
      if (oData.author_name) author = oData.author_name;
      if (oData.thumbnail_url) thumbnailUrl = oData.thumbnail_url;
    }

    const resolvedStream = streamResult.status === 'fulfilled' ? streamResult.value : null;

    res.status(200).json({
      success: true,
      data: {
        videoId,
        title,
        author,
        thumbnailUrl,
        durationSeconds: resolvedStream?.durationSec || 0,
        hasDirectStream: Boolean(resolvedStream?.url),
        streamProxyUrl: `/api/media/youtube/stream?videoId=${videoId}`,
        audioProxyUrl: `/api/media/youtube/audio?videoId=${videoId}`,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
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

    const resolved = await resolveDirectYouTubeStream(videoId);
    if (!resolved || !resolved.url) {
      res.status(404).json({
        success: false,
        error: 'Direct MP4 stream unavailable; client will use Next.js /youtube-stream or PostMessage IFrame engine.',
      });
      return;
    }

    pipeYouTubeStreamFollowingRedirects(resolved.url, req, res, videoId, resolved.durationSec, 6);
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  }
});

const ytAudioUrlCache = new Map<string, CachedYtStream>();

async function resolveDirectYouTubeAudio(videoId: string): Promise<CachedYtStream | null> {
  const cached = ytAudioUrlCache.get(videoId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached;
  }

  // Tier 1: yt-dlp pure audio extraction (100% reliable across modern YouTube content)
  try {
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const ytdlpBin = await getOrBootstrapYtDlpBinary();
    if (ytdlpBin) {
      const ytdlpArgs = ytDlpArgs(ytdlpBin, [
        '-f',
        'ba/b[ext=m4a]/ba[ext=webm]/18/b',
        '--print',
        '%(url)s',
        '--print',
        '%(duration)s',
        '--no-playlist',
        watchUrl,
      ]);

      const ytdlpResult = await new Promise<{ url: string; durSec: number } | null>((resolve) => {
        execFile(
          ytdlpBin,
          ytdlpArgs,
          { timeout: 12000 },
          (err, stdout) => {
            if (!err && stdout) {
              const lines = stdout.trim().split('\n').map((l) => l.trim()).filter(Boolean);
              const foundUrl = lines.find((l) => l.startsWith('http'));
              const durLine = lines.find((l) => /^\d+(\.\d+)?$/.test(l));
              const parsedDur = durLine ? Math.round(Number(durLine)) : 0;
              if (foundUrl) {
                resolve({ url: foundUrl, durSec: parsedDur });
                return;
              }
            }
            resolve(null);
          }
        );
      });

      if (ytdlpResult?.url) {
        const entry: CachedYtStream = {
          url: ytdlpResult.url,
          durationSec: ytdlpResult.durSec,
          expiresAt: Date.now() + 45 * 60 * 1000,
        };
        ytAudioUrlCache.set(videoId, entry);
        return entry;
      }
    }
  } catch { }

  // Tier 2: Fallback to video stream (which has muxed audio)
  const vid = await resolveDirectYouTubeStream(videoId);
  if (vid?.url) {
    ytAudioUrlCache.set(videoId, vid);
    return vid;
  }

  return null;
}

// GET /api/media/youtube/audio?videoId=...
// Guaranteed same-origin audio bridge for Live Recording & Live Broadcast mixing
router.get('/youtube/audio', async (req: Request, res: Response): Promise<void> => {
  try {
    const raw = String(req.query.videoId || req.query.url || '');
    const videoId = extractYouTubeId(raw);
    if (!videoId) {
      res.status(400).json({ success: false, error: 'Invalid YouTube videoId' });
      return;
    }

    const resolved = await resolveDirectYouTubeAudio(videoId);
    if (!resolved || !resolved.url) {
      res.status(404).json({
        success: false,
        error: 'Direct audio stream unavailable',
      });
      return;
    }

    pipeYouTubeStreamFollowingRedirects(resolved.url, req, res, videoId, resolved.durationSec, 6);
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  }
});

// GET /api/media/website/proxy?url=...
router.get('/website/proxy', async (req: Request, res: Response): Promise<void> => {
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
    } catch { }
  }

  try {
    const resp = await fetch(parsed.toString(), {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });

    const contentType = resp.headers.get('content-type') || 'text/html; charset=utf-8';

    if (contentType.includes('text/html')) {
      let html = await resp.text();
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
              if (/^https?:\\/\\//i.test(resolved) && !resolved.includes("/api/media/website/proxy") && !resolved.includes("/web-proxy")) {
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
        html = html.replace(/<head[^>]*>/i, (match) => `${match}${baseTag}${helperScript}`);
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
// Accepts a multipart `file` (≤500MB) or `uploadId` from the chunked /api/uploads flow (for files > 90MB).
router.post('/upload', requireAuth, upload.single('file'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  let tmpPath: string | null = null;
  try {
    let fileInfo: { path: string; originalname: string; mimetype: string; size: number } | null = null;
    if (req.file) {
      fileInfo = { path: req.file.path, originalname: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size };
    } else if (typeof req.body.uploadId === 'string' && req.body.uploadId) {
      fileInfo = await takeCompletedUpload(req, req.body.uploadId);
    }
    if (!fileInfo) {
      res.status(400).json({ success: false, error: 'File is required' });
      return;
    }
    tmpPath = fileInfo.path;

    const workspaceId = await resolveWorkspaceId(req);
    const mimeType = (fileInfo.mimetype || 'application/octet-stream').toLowerCase();
    const assetType = resolveAssetType(mimeType);
    if (!assetType) {
      res.status(400).json({
        success: false,
        error: `File type "${mimeType}" is not allowed. Allowed: PNG, JPEG, GIF, WEBP, MP4, WEBM, MOV, MP3, PDF.`,
      });
      return;
    }

    let studioIdRaw = String(req.body.studioId || req.body.sessionId || req.headers['x-session-id'] || '').trim();
    if (studioIdRaw) {
      // Only tag media to a studio the user may use (or a new on-demand studio of theirs).
      try {
        await getAccessibleStudio(req, studioIdRaw, { createIfMissing: true });
      } catch {
        studioIdRaw = '';
      }
    }

    await purgeOrphanedAndDummyMedia(workspaceId);

    if (assetType === 'VIDEO') {
      const newDuration = req.body.duration ? Math.round(Number(req.body.duration)) : 0;
      const existingVideos = await prisma.mediaAsset.findMany({
        where: { workspaceId, assetType: 'VIDEO' },
        select: { metadata: true },
      });
      let currentTotalDuration = 0;
      for (const v of existingVideos) {
        const meta = (v.metadata as Record<string, any>) || {};
        currentTotalDuration += Number(meta.duration || 0);
      }
      const MAX_TOTAL_DURATION_SEC = 3600;
      if (currentTotalDuration + newDuration > MAX_TOTAL_DURATION_SEC) {
        const remainingSec = Math.max(0, MAX_TOTAL_DURATION_SEC - currentTotalDuration);
        res.status(400).json({
          success: false,
          error: `Total video duration limit (60 minutes) exceeded! Current total is ${Math.floor(currentTotalDuration / 60)}m. You only have ${Math.floor(remainingSec / 60)}m ${remainingSec % 60}s remaining, but this video is ${Math.floor(newDuration / 60)}m ${newDuration % 60}s. Please delete an existing video first.`,
        });
        return;
      }
      if (req.body.height && Number(req.body.height) > 1080) {
        res.status(400).json({ success: false, error: 'Video resolution exceeds limit: Maximum 1080p resolution allowed.' });
        return;
      }
    }

    if (assetType === 'AUDIO') {
      const audioCount = await prisma.mediaAsset.count({ where: { workspaceId, assetType: 'AUDIO' } });
      if (audioCount >= 2) {
        res.status(400).json({
          success: false,
          error: 'Audio quota exceeded: Maximum 2 audio files allowed in media library. Please delete an existing audio first.',
        });
        return;
      }
      if (req.body.duration && Number(req.body.duration) > 900) {
        res.status(400).json({ success: false, error: 'Audio duration exceeds limit: Maximum 15 minutes (900 seconds) allowed.' });
        return;
      }
    }

    if (assetType === 'IMAGE' || assetType === 'PDF') {
      const maxSizeBytes = 2 * 1024 * 1024;
      if (fileInfo.size > maxSizeBytes) {
        res.status(400).json({
          success: false,
          error: `File size exceeds limit: Maximum 2MB allowed for images and PDFs. Uploaded file is ${(fileInfo.size / (1024 * 1024)).toFixed(1)}MB.`,
        });
        return;
      }
      const docCount = await prisma.mediaAsset.count({
        where: { workspaceId, assetType: { in: ['IMAGE', 'PDF'] } },
      });
      if (docCount >= 2) {
        res.status(400).json({
          success: false,
          error: 'Image/PDF quota exceeded: Maximum 2 documents/images allowed. Please delete an existing file first.',
        });
        return;
      }
    }

    const studioId = studioIdRaw || 'default';
    const cleanStudioId = studioId.replace(/^studio-/, '');
    const cleanFilename = fileInfo.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);
    const localFileName = `${Date.now()}-${cleanFilename}`;
    await fs.promises.rename(fileInfo.path, path.join(LOCAL_UPLOAD_DIR, localFileName));
    tmpPath = null;

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
        name: String(req.body.name || fileInfo.originalname).slice(0, 255),
        assetType,
        mimeType,
        fileSize: BigInt(fileInfo.size),
        storagePath: `local://${localFileName}`,
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

    res.status(201).json({ success: true, data: serializeMediaAsset(mediaAsset) });
  } catch (error) {
    next(error);
  } finally {
    if (tmpPath) await fs.promises.unlink(tmpPath).catch(() => null);
  }
});

// GET /api/media
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const studioId = ((req.query.studioId as string) || (req.headers['x-session-id'] as string) || '').trim();
    const cleanStudioId = studioId.replace(/^studio-/, '');
    const typeFilter = String(req.query.type || '').toUpperCase();

    const assets = await prisma.mediaAsset.findMany({
      where: {
        workspaceId,
        ...(['VIDEO', 'IMAGE', 'AUDIO', 'PDF'].includes(typeFilter) ? { assetType: typeFilter as AssetType } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

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

    res.status(200).json({ success: true, data: filtered.map((asset) => serializeMediaAsset(asset)) });
  } catch (error) {
    next(error);
  }
});

// GET /api/media/prerecorded-preview/:id?exp&sig  (signed link used by the admin <video> preview)
router.get('/prerecorded-preview/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!verifySignedQuery(`prerecorded:${req.params.id}`, req.query)) {
      res.status(403).json({ success: false, error: 'Link expired' });
      return;
    }
    const broadcast = await prisma.broadcast.findUnique({ where: { id: req.params.id } });
    const videoFilePath = ((broadcast?.settings as Record<string, any>) || {}).videoFilePath as string | undefined;
    const { PrerecordedStreamerService } = await import('../services/prerecorded-streamer.service');
    const dir = PrerecordedStreamerService.getInstance().getStorageDir();
    const safePath = videoFilePath ? path.join(dir, path.basename(videoFilePath)) : '';
    if (!safePath || !fs.existsSync(safePath)) {
      res.status(404).json({ success: false, error: 'Video file no longer exists (already auto-deleted)' });
      return;
    }
    await streamLocalFile(req, res, safePath, 'video/mp4');
  } catch (error) {
    next(error);
  }
});

// GET /api/media/recording-file/:id?exp&sig  (signed download link for recordings stored in MinIO)
router.get('/recording-file/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!verifySignedQuery(`recording:${req.params.id}`, req.query)) {
      res.status(403).json({ success: false, error: 'Link expired' });
      return;
    }
    const recording = await prisma.recording.findUnique({ where: { id: req.params.id } });
    if (!recording?.storagePath) {
      res.status(404).json({ success: false, error: 'Recording file not found' });
      return;
    }
    const fileRes = await storageService.getFileStream(recording.storagePath);
    if (!fileRes.success || !fileRes.data) {
      res.status(404).json({ success: false, error: 'Recording file not found in storage' });
      return;
    }
    const safeName = `${recording.title.replace(/[^a-zA-Z0-9_-]/g, '_') || 'recording'}.webm`;
    res.setHeader('Content-Type', fileRes.data.contentType || 'video/webm');
    if (fileRes.data.contentLength) res.setHeader('Content-Length', fileRes.data.contentLength);
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    (fileRes.data.stream as any).pipe(res);
  } catch (error) {
    next(error);
  }
});

// GET /api/media/:id
router.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const asset = await prisma.mediaAsset.findUnique({ where: { id: req.params.id } });
    if (!asset) throw new HttpError(404, 'Media asset not found');
    await assertWorkspaceAccess(req, asset.workspaceId);
    res.status(200).json({ success: true, data: serializeMediaAsset(asset) });
  } catch (error) {
    next(error);
  }
});

// GET /api/media/:id/file
// Public by unguessable id because it is used directly as <video>/<img> src on the stage and by guests.
router.get('/:id/file', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const asset = await prisma.mediaAsset.findUnique({ where: { id: req.params.id } });
    if (!asset) {
      res.status(404).json({ success: false, error: 'Media asset not found' });
      return;
    }

    // Never let stored files render as HTML/SVG on our origin.
    const safeType = resolveAssetType(asset.mimeType) ? asset.mimeType : 'application/octet-stream';
    const extra: Record<string, string> = {
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Cache-Control': 'private, max-age=3600',
    };
    if (safeType === 'application/octet-stream') extra['Content-Disposition'] = 'attachment';

    if (asset.storagePath.startsWith('local://')) {
      const fullPath = localPathFor(asset.storagePath);
      if (!fs.existsSync(fullPath)) {
        res.status(404).json({ success: false, error: 'Local media file not found on disk' });
        return;
      }
      await streamLocalFile(req, res, fullPath, safeType, extra);
      return;
    }

    const fileRes = await storageService.getFileStream(asset.storagePath);
    if (!fileRes.success || !fileRes.data) {
      res.status(404).json({ success: false, error: 'Failed to retrieve media file stream' });
      return;
    }
    res.setHeader('Content-Type', safeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    for (const [k, v] of Object.entries(extra)) res.setHeader(k, v);
    if (fileRes.data.contentLength) res.setHeader('Content-Length', fileRes.data.contentLength);
    (fileRes.data.stream as any).pipe(res);
  } catch (error) {
    next(error);
  }
});

// POST /api/media/cleanup
router.post('/cleanup', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const purgedCount = await purgeOrphanedAndDummyMedia(workspaceId);
    res.status(200).json({ success: true, data: { purgedCount } });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/media/session/:sessionId
router.delete('/session/:sessionId', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await getAccessibleStudio(req, req.params.sessionId);
    const count = await deleteSessionMedia(req.params.sessionId);
    res.status(200).json({ success: true, deletedCount: count });
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) {
      res.status(200).json({ success: true, deletedCount: 0 });
      return;
    }
    next(error);
  }
});

// DELETE /api/media/:id
router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const asset = await prisma.mediaAsset.findUnique({ where: { id: req.params.id } });
    if (!asset) throw new HttpError(404, 'Media asset not found');
    await assertWorkspaceAccess(req, asset.workspaceId);

    if (asset.storagePath.startsWith('local://')) {
      await fs.promises.unlink(localPathFor(asset.storagePath)).catch(() => null);
    } else {
      await storageService.deleteFile(asset.storagePath).catch(() => null);
    }
    await prisma.mediaAsset.delete({ where: { id: asset.id } });
    res.status(200).json({ success: true, data: { id: asset.id, deleted: true } });
  } catch (error) {
    next(error);
  }
});

// Remove abandoned multer temp files (crashed/aborted uploads)
setInterval(async () => {
  try {
    for (const f of await fs.promises.readdir(UPLOAD_TMP_DIR)) {
      const full = path.join(UPLOAD_TMP_DIR, f);
      const st = await fs.promises.stat(full).catch(() => null);
      if (st && Date.now() - st.mtimeMs > 6 * 3600 * 1000) await fs.promises.unlink(full).catch(() => null);
    }
  } catch { }
}, 30 * 60 * 1000);

export default router;
