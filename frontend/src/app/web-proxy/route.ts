import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function healAndNormalizeUrl(raw: string): string {
  let trimmed = (raw || "").trim();
  if (!trimmed) return "";
  // Auto-heal broken protocols like "https: /", "https:/", "http:/", "https;//"
  trimmed = trimmed.replace(/^https?\s*[:;]\s*\/+\s*/i, (m) =>
    m.toLowerCase().startsWith("http:") ? "http://" : "https://"
  );
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = "https://" + trimmed.replace(/^\/+/, "");
  }
  return trimmed;
}

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get("url") || "";
  const mode = req.nextUrl.searchParams.get("mode") || "proxy";
  const cleanUrl = healAndNormalizeUrl(rawUrl);

  if (!cleanUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(cleanUrl);
  } catch {
    return new NextResponse("Invalid URL", { status: 400 });
  }

  const responseHeaders = new Headers({
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store, max-age=0",
  });

  // Reader Mode (or fallback): fetches clean readable article content via Jina Reader API
  if (mode === "reader") {
    try {
      const readerResp = await fetch(`https://r.jina.ai/${parsed.toString()}`, {
        headers: {
          Accept: "text/plain",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(10000),
      });
      const text = await readerResp.text();
      const escaped = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/^### (.*)$/gm, '<h3 style="color:#38bdf8;margin-top:20px;">$1</h3>')
        .replace(/^## (.*)$/gm, '<h2 style="color:#f8fafc;margin-top:24px;border-bottom:1px solid #334155;padding-bottom:6px;">$1</h2>')
        .replace(/^# (.*)$/gm, '<h1 style="color:#ffffff;font-size:28px;margin-bottom:12px;">$1</h1>')
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/!\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:12px;margin:12px 0;" />')
        .replace(/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="/web-proxy?url=$2" style="color:#38bdf8;text-decoration:underline;">$1</a>')
        .replace(/\n\n/g, "</p><p style='margin:12px 0;line-height:1.7;'>");

      const readerHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${parsed.hostname}</title></head>
      <body style="background:#0b0f19;color:#e2e8f0;font-family:Inter,system-ui,sans-serif;padding:32px 48px;max-width:960px;margin:0 auto;font-size:17px;line-height:1.7;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:14px;margin-bottom:20px;border-bottom:1px solid rgba(255,255,255,0.12);">
          <span style="color:#38bdf8;font-weight:700;font-size:14px;">📖 READER VIEW • ${parsed.hostname}</span>
          <a href="/web-proxy?url=${encodeURIComponent(parsed.toString())}" style="color:#94a3b8;font-size:12px;text-decoration:underline;">Switch to Full Interactive Page</a>
        </div>
        <p style="margin:12px 0;line-height:1.7;">${escaped}</p>
      </body></html>`;
      responseHeaders.set("Content-Type", "text/html; charset=utf-8");
      return new NextResponse(readerHtml, { status: 200, headers: responseHeaders });
    } catch (e) {
      // Fall through to standard proxy
    }
  }

  try {
    const resp = await fetch(parsed.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });

    const contentType = resp.headers.get("content-type") || "text/html; charset=utf-8";

    if (contentType.includes("text/html")) {
      let html = await resp.text();

      // Strip any meta CSP or X-Frame-Options tags embedded in the page HTML
      html = html
        .replace(/<meta[^>]*http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi, "")
        .replace(/<meta[^>]*http-equiv=["']?X-Frame-Options["']?[^>]*>/gi, "");

      const finalUrl = resp.url ? new URL(resp.url) : parsed;
      const origin = `${finalUrl.protocol}//${finalUrl.host}`;
      const baseHref = `${origin}${finalUrl.pathname.endsWith("/") ? finalUrl.pathname : finalUrl.pathname.replace(/[^/]*$/, "")}`;
      const baseTag = `<base href="${baseHref}" />`;

      // Rewrite root-relative src="/..." and href="/..." so assets resolve cleanly against target origin
      html = html
        .replace(/\b(src|href)=["']\/(?!\/)/gi, `$1="${origin}/`)
        .replace(/\baction=["']\/(?!\/)/gi, `action="${origin}/`);

      // Inject navigation & form helper so clicking links or searching stays inside the stage proxy
      const helperScript = `<script>
        (function() {
          document.addEventListener("click", function(e) {
            var a = e.target && e.target.closest ? e.target.closest("a") : null;
            if (!a) return;
            var rawHref = a.getAttribute("href");
            if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("javascript:")) return;
            try {
              var resolved = new URL(a.href, "${finalUrl.toString()}").toString();
              if (/^https?:\\/\\//i.test(resolved) && !resolved.includes("/web-proxy") && !resolved.includes("/api/media/website/proxy")) {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = "/web-proxy?url=" + encodeURIComponent(resolved);
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
                window.location.href = "/web-proxy?url=" + encodeURIComponent(actionUrl.toString());
              } catch (err) {}
            }
          }, true);
        })();
      </script>`;

      if (/<head[^>]*>/i.test(html)) {
        html = html.replace(/<head[^>]*>/i, (match) => `${match}${baseTag}${helperScript}`);
      } else {
        html = `<head>${baseTag}${helperScript}</head>${html}`;
      }

      responseHeaders.set("Content-Type", "text/html; charset=utf-8");
      return new NextResponse(html, { status: 200, headers: responseHeaders });
    }

    const arrayBuf = await resp.arrayBuffer();
    responseHeaders.set("Content-Type", contentType);
    return new NextResponse(Buffer.from(arrayBuf), {
      status: resp.status,
      headers: responseHeaders,
    });
  } catch (err) {
    const fallbackHtml = `<!DOCTYPE html><html><body style="background:#090a14;color:#f8fafc;font-family:Inter,system-ui,sans-serif;padding:40px;text-align:center;">
      <h3 style="color:#38bdf8;margin-bottom:8px;">Website Protected by Firewall — Opening Reader View...</h3>
      <p style="color:#94a3b8;font-size:14px;margin-bottom:18px;">${(err as Error).message}</p>
      <a href="/web-proxy?url=${encodeURIComponent(parsed.toString())}&mode=reader" style="display:inline-block;padding:10px 20px;border-radius:10px;background:#0284c7;color:#fff;text-decoration:none;font-weight:700;font-size:13px;">📖 Open Clean Reader View</a>
    </body></html>`;
    responseHeaders.set("Content-Type", "text/html; charset=utf-8");
    return new NextResponse(fallbackHtml, { status: 200, headers: responseHeaders });
  }
}
