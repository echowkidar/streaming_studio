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

const ytUrlCache = new Map<string, { url: string; expiresAt: number }>();

async function resolveYouTubeDirectStreamUrl(videoId: string): Promise<string | null> {
  const cached = ytUrlCache.get(videoId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  // Tier 1: Direct YouTube InnerTube Player API (Multiple Client Profiles)
  const clients = [
    {
      clientName: "ANDROID_VR",
      clientVersion: "1.56.21",
      androidSdkVersion: 32,
      userAgent:
        "com.google.android.apps.youtube.vr.oculus/1.56.21 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip",
    },
    {
      clientName: "IOS",
      clientVersion: "19.29.1",
      deviceMake: "Apple",
      deviceModel: "iPhone16,2",
      userAgent:
        "com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X;)",
    },
    {
      clientName: "ANDROID",
      clientVersion: "19.29.37",
      androidSdkVersion: 34,
      userAgent:
        "com.google.android.youtube/19.29.37 (Linux; U; Android 14) gzip",
    },
    {
      clientName: "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
      clientVersion: "2.0",
      userAgent:
        "Mozilla/5.0 (PlayStation; PlayStation 4/11.50) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Safari/605.1.15",
    },
  ];

  for (const c of clients) {
    try {
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
          ...(c.clientName === "TVHTML5_SIMPLY_EMBEDDED_PLAYER"
            ? { thirdParty: { embedUrl: "https://www.youtube.com/" } }
            : {}),
        },
        contentCheckOk: true,
        racyCheckOk: true,
      };

      const res = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": c.userAgent,
        },
        body: JSON.stringify(bodyPayload),
        signal: AbortSignal.timeout(5500),
      });

      if (res.ok) {
        const data: any = await res.json();
        const formats: any[] = data?.streamingData?.formats || [];
        const best =
          formats.find((f) => f.itag === 22 && f.url) ||
          formats.find((f) => f.itag === 18 && f.url) ||
          formats.find(
            (f) => f.url && String(f.mimeType || "").includes("video/mp4") && f.audioQuality
          ) ||
          formats.find((f) => f.url && String(f.mimeType || "").includes("video/mp4"));
        if (best?.url) {
          ytUrlCache.set(videoId, {
            url: best.url,
            expiresAt: Date.now() + 20 * 60 * 1000,
          });
          return best.url;
        }
      }
    } catch {}
  }

  // Tier 2: Public Piped / Invidious Stream Mirrors
  const mirrors = [
    `https://pipedapi.kavin.rocks/streams/${videoId}`,
    `https://pipedapi.adminforge.de/streams/${videoId}`,
    `https://pipedapi.drgns.space/streams/${videoId}`,
    `https://pipedapi.smnz.de/streams/${videoId}`,
  ];
  for (const apiUrl of mirrors) {
    try {
      const resp = await fetch(apiUrl, { signal: AbortSignal.timeout(4500) });
      if (resp.ok) {
        const data: any = await resp.json();
        const streams: any[] = data?.videoStreams || [];
        const mp4 =
          streams.find((s) => !s.videoOnly && s.format === "MPEG_4" && s.url) ||
          streams.find((s) => !s.videoOnly && s.url);
        if (mp4?.url) {
          ytUrlCache.set(videoId, {
            url: mp4.url,
            expiresAt: Date.now() + 20 * 60 * 1000,
          });
          return mp4.url;
        }
      }
    } catch {}
  }

  return null;
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

  const directUrl = await resolveYouTubeDirectStreamUrl(videoId);
  if (!directUrl) {
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

    // Native fetch in Node 20 automatically follows 301/302/307/308 redirects!
    const upstream = await fetch(directUrl, {
      headers: reqHeaders,
      redirect: "follow",
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
