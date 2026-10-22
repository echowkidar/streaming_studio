import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function extractYouTubeId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

const ytUrlCache = new Map<string, { url: string; durationSec?: number; expiresAt: number }>();
const inFlightStreamPromises = new Map<string, Promise<{ url: string; durationSec?: number } | null>>();

async function resolveYouTubeDirectStreamUrl(
  videoId: string
): Promise<{ url: string; durationSec?: number } | null> {
  const cached = ytUrlCache.get(videoId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached;
  }

  const existing = inFlightStreamPromises.get(videoId);
  if (existing) {
    return existing;
  }

  const p = (async () => {
    // Parallel Race Tier 1: Query ANDROID_VR and mobile InnerTube Client Profiles
    const clients = [
      {
        clientName: "ANDROID_VR",
        clientVersion: "1.60.19",
        androidSdkVersion: 32,
        userAgent:
          "com.google.android.apps.youtube.vr.oculus/1.60.19 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip",
      },
      {
        clientName: "IOS",
        clientVersion: "19.45.4",
        deviceMake: "Apple",
        deviceModel: "iPhone16,2",
        userAgent:
          "com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 18_1_0 like Mac OS X;)",
      },
      {
        clientName: "ANDROID",
        clientVersion: "19.44.38",
        androidSdkVersion: 34,
        userAgent:
          "com.google.android.youtube/19.44.38 (Linux; U; Android 14) gzip",
      },
    ];

    try {
      const winner = await Promise.any(
        clients.map(async (c) => {
          const bodyPayload: any = {
            videoId,
            context: {
              client: {
                clientName: c.clientName,
                clientVersion: c.clientVersion,
                hl: "en",
                gl: "US",
                ...(c.androidSdkVersion ? { androidSdkVersion: c.androidSdkVersion } : {}),
                ...(c.deviceMake ? { deviceMake: c.deviceMake, deviceModel: c.deviceModel } : {}),
              },
              thirdParty: { embedUrl: "https://www.youtube.com/" },
            },
            contentCheckOk: true,
            racyCheckOk: true,
          };

          const res = await fetch(
            "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "User-Agent": c.userAgent,
                Origin: "https://www.youtube.com",
              },
              body: JSON.stringify(bodyPayload),
              signal: AbortSignal.timeout(2800),
            }
          );

          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data: any = await res.json();
          const combinedFormats: any[] = data?.streamingData?.formats || [];
          const adaptiveFormats: any[] = data?.streamingData?.adaptiveFormats || [];
          const formats: any[] = [...combinedFormats, ...adaptiveFormats];
          const best =
            combinedFormats.find((f) => f.itag === 22 && f.url) ||
            combinedFormats.find((f) => f.itag === 18 && f.url) ||
            combinedFormats.find((f) => f.url && String(f.mimeType || "").includes("video/mp4")) ||
            formats.find(
              (f) =>
                f.url &&
                String(f.mimeType || "").includes("video/mp4") &&
                (f.audioQuality || f.audioChannels)
            );

          if (!best?.url) throw new Error("No MP4 format");
          const durSec = Number(data?.videoDetails?.lengthSeconds || 0) || undefined;
          return { url: String(best.url), durationSec: durSec };
        })
      );

      if (winner?.url) {
        ytUrlCache.set(videoId, {
          url: winner.url,
          durationSec: winner.durationSec,
          expiresAt: Date.now() + 45 * 60 * 1000,
        });
        return winner;
      }
    } catch { }

    // Parallel Race Tier 2: Public Piped / Invidious Stream Mirrors
    const mirrors = [
      `https://pipedapi.kavin.rocks/streams/${videoId}`,
      `https://pipedapi.adminforge.de/streams/${videoId}`,
      `https://pipedapi.drgns.space/streams/${videoId}`,
      `https://pipedapi.smnz.de/streams/${videoId}`,
    ];

    try {
      const mirrorWinner = await Promise.any(
        mirrors.map(async (apiUrl) => {
          const resp = await fetch(apiUrl, { signal: AbortSignal.timeout(2400) });
          if (!resp.ok) throw new Error(`Mirror ${resp.status}`);
          const data: any = await resp.json();
          const streams: any[] = data?.videoStreams || [];
          const mp4 =
            streams.find((s) => !s.videoOnly && s.format === "MPEG_4" && s.url) ||
            streams.find((s) => !s.videoOnly && s.url);
          if (!mp4?.url) throw new Error("No stream");
          const durSec = Number(data?.duration || 0) || undefined;
          return { url: String(mp4.url), durationSec: durSec };
        })
      );

      if (mirrorWinner?.url) {
        ytUrlCache.set(videoId, {
          url: mirrorWinner.url,
          durationSec: mirrorWinner.durationSec,
          expiresAt: Date.now() + 45 * 60 * 1000,
        });
        return mirrorWinner;
      }
    } catch { }

    return null;
  })().finally(() => {
    inFlightStreamPromises.delete(videoId);
  });

  inFlightStreamPromises.set(videoId, p);
  return p;
}

export async function GET(req: NextRequest) {
  const raw =
    req.nextUrl.searchParams.get("videoId") ||
    req.nextUrl.searchParams.get("url") ||
    "";
  const videoId = extractYouTubeId(raw);
  if (!videoId) {
    return NextResponse.json({ success: false, error: "Invalid videoId" }, { status: 400 });
  }

  const resolved = await resolveYouTubeDirectStreamUrl(videoId);
  if (!resolved?.url) {
    return NextResponse.json(
      { success: false, error: "Direct MP4 stream unavailable" },
      { status: 404 }
    );
  }

  try {
    const reqHeaders: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    };
    const rangeHeader = req.headers.get("range");
    if (rangeHeader) {
      reqHeaders["Range"] = rangeHeader;
    }

    const upstream = await fetch(resolved.url, {
      headers: reqHeaders,
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
    });

    if (!upstream.ok && upstream.status !== 206) {
      ytUrlCache.delete(videoId);
      return NextResponse.json(
        { success: false, error: `Upstream status ${upstream.status}` },
        { status: 502 }
      );
    }

    const resHeaders = new Headers({
      "Access-Control-Allow-Origin": "*",
      "Cross-Origin-Resource-Policy": "cross-origin",
      "Accept-Ranges": "bytes",
      "Content-Type": upstream.headers.get("content-type") || "video/mp4",
    });
    if (resolved.durationSec) {
      resHeaders.set("X-Video-Duration", String(resolved.durationSec));
    }
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) resHeaders.set("Content-Length", contentLength);
    const contentRange = upstream.headers.get("content-range");
    if (contentRange) resHeaders.set("Content-Range", contentRange);

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: resHeaders,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 502 }
    );
  }
}
