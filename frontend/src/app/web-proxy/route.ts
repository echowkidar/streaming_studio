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

function buildGooglePortalHtml(parsed: URL, searchQuery: string, resultsHtml: string = ""): string {
  const escapedQuery = searchQuery
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapedQuery ? `${escapedQuery} - Google Search` : "Google"}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #171717;
      color: #e8eaed;
      font-family: Arial, Inter, system-ui, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .top-nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 24px;
      border-bottom: 1px solid #303134;
      background: #202124;
    }
    .logo {
      font-size: 26px;
      font-weight: 700;
      letter-spacing: -0.5px;
      text-decoration: none;
      user-select: none;
    }
    .logo span:nth-child(1) { color: #8ab4f8; }
    .logo span:nth-child(2) { color: #f28b82; }
    .logo span:nth-child(3) { color: #fdd663; }
    .logo span:nth-child(4) { color: #8ab4f8; }
    .logo span:nth-child(5) { color: #81c995; }
    .logo span:nth-child(6) { color: #f28b82; }
    .search-bar {
      display: flex;
      align-items: center;
      background: #303134;
      border: 1px solid #5f6368;
      border-radius: 24px;
      padding: 8px 18px;
      width: 100%;
      max-width: 640px;
      gap: 10px;
    }
    .search-bar:focus-within {
      background: #303134;
      border-color: #8ab4f8;
      box-shadow: 0 1px 6px rgba(138, 180, 248, 0.28);
    }
    .search-bar input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: #ffffff;
      font-size: 16px;
    }
    .search-bar button {
      background: #8ab4f8;
      color: #202124;
      border: none;
      border-radius: 16px;
      padding: 6px 16px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
    }
    .hero-center {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 24px;
      gap: 26px;
    }
    .hero-logo {
      font-size: 72px;
      font-weight: 700;
      letter-spacing: -2px;
    }
    .quick-links {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: center;
      max-width: 680px;
    }
    .quick-pill {
      padding: 8px 16px;
      border-radius: 20px;
      background: #303134;
      border: 1px solid #3c4043;
      color: #e8eaed;
      text-decoration: none;
      font-size: 13px;
      transition: all 0.15s;
    }
    .quick-pill:hover {
      border-color: #8ab4f8;
      color: #8ab4f8;
    }
    .results-wrap {
      max-width: 820px;
      width: 100%;
      padding: 24px 32px 60px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .result-card {
      background: #202124;
      border: 1px solid #303134;
      border-radius: 12px;
      padding: 16px 20px;
    }
    .result-card a.title {
      color: #8ab4f8;
      font-size: 19px;
      font-weight: 600;
      text-decoration: none;
      display: block;
      margin-bottom: 6px;
    }
    .result-card a.title:hover { text-decoration: underline; }
    .result-card .url {
      color: #81c995;
      font-size: 12px;
      margin-bottom: 8px;
      word-break: break-all;
    }
    .result-card .snippet {
      color: #bdc1c6;
      font-size: 14px;
      line-height: 1.55;
    }
  </style>
</head>
<body>
  ${
    escapedQuery
      ? `<div class="top-nav">
          <div style="display:flex;align-items:center;gap:24px;flex:1;">
            <a href="/web-proxy?url=https://www.google.com" class="logo">
              <span>G</span><span>o</span><span>o</span><span>g</span><span>l</span><span>e</span>
            </a>
            <form action="/web-proxy" method="GET" class="search-bar">
              <input type="hidden" name="url" value="https://www.google.com/search" />
              <input type="text" name="q" value="${escapedQuery}" placeholder="Search Google or type a URL..." autofocus />
              <button type="submit">Search</button>
            </form>
          </div>
        </div>
        <div class="results-wrap">
          ${resultsHtml}
        </div>`
      : `<div class="hero-center">
          <div class="logo hero-logo">
            <span>G</span><span>o</span><span>o</span><span>g</span><span>l</span><span>e</span>
          </div>
          <form action="/web-proxy" method="GET" class="search-bar">
            <input type="hidden" name="url" value="https://www.google.com/search" />
            <input type="text" name="q" placeholder="Search Google live on Stage or enter any topic..." autofocus />
            <button type="submit">Google Search</button>
          </form>
          <div class="quick-links">
            <a class="quick-pill" href="/web-proxy?url=${encodeURIComponent("https://www.google.com/search")}&q=${encodeURIComponent("Breaking World News Today")}">🔥 Breaking World News</a>
            <a class="quick-pill" href="/web-proxy?url=${encodeURIComponent("https://en.wikipedia.org/wiki/Main_Page")}">🌐 Wikipedia Live</a>
            <a class="quick-pill" href="/web-proxy?url=${encodeURIComponent("https://www.bbc.com/news")}">📰 BBC World News</a>
            <a class="quick-pill" href="/web-proxy?url=${encodeURIComponent("https://pib.gov.in")}">🇮🇳 PIB India</a>
            <a class="quick-pill" href="/web-proxy?url=${encodeURIComponent("https://www.coingecko.com")}">📈 Live Crypto & Markets</a>
          </div>
        </div>`
  }
</body>
</html>`;
}

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get("url") || "";
  const mode = req.nextUrl.searchParams.get("mode") || "proxy";
  const queryParam = req.nextUrl.searchParams.get("q") || "";
  const cleanUrl = healAndNormalizeUrl(rawUrl);

  if (!cleanUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(cleanUrl);
    if (queryParam && !parsed.searchParams.get("q")) {
      parsed.searchParams.set("q", queryParam);
    }
  } catch {
    return new NextResponse("Invalid URL", { status: 400 });
  }

  const responseHeaders = new Headers({
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store, max-age=0",
  });

  const hostLower = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const isGoogleDomain = hostLower === "google.com" || hostLower.startsWith("google.");

  // Special Handler for Google.com & Google Search so it NEVER shows "refused to connect" or frame-killer blank page!
  if (isGoogleDomain && mode !== "reader") {
    const q = (parsed.searchParams.get("q") || queryParam || "").trim();
    if (!q) {
      responseHeaders.set("Content-Type", "text/html; charset=utf-8");
      return new NextResponse(buildGooglePortalHtml(parsed, ""), {
        status: 200,
        headers: responseHeaders,
      });
    }

    // Fetch live search results via DuckDuckGo Lite / HTML or Jina Search
    let resultsCards = "";
    try {
      const ddgResp = await fetch(
        `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
          },
          signal: AbortSignal.timeout(8000),
        }
      );
      if (ddgResp.ok) {
        const ddgHtml = await ddgResp.text();
        const linkRegex = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
        const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
        const links: Array<{ href: string; title: string }> = [];
        const snippets: string[] = [];
        let m: RegExpExecArray | null;
        while ((m = linkRegex.exec(ddgHtml)) !== null && links.length < 10) {
          let href = m[1];
          const uddgMatch = href.match(/[?&]uddg=([^&]+)/);
          if (uddgMatch) {
            try {
              href = decodeURIComponent(uddgMatch[1]);
            } catch {}
          }
          const cleanTitle = m[2].replace(/<[^>]+>/g, "").trim();
          if (href.startsWith("http") && cleanTitle) {
            links.push({ href, title: cleanTitle });
          }
        }
        while ((m = snippetRegex.exec(ddgHtml)) !== null && snippets.length < 10) {
          snippets.push(m[1].replace(/<[^>]+>/g, "").trim());
        }

        if (links.length > 0) {
          resultsCards = links
            .map(
              (item, idx) => `<div class="result-card">
                <a class="title" href="/web-proxy?url=${encodeURIComponent(item.href)}">${item.title}</a>
                <div class="url">${item.href}</div>
                <div class="snippet">${snippets[idx] || ""}</div>
              </div>`
            )
            .join("");
        }
      }
    } catch {}

    if (!resultsCards) {
      resultsCards = `<div class="result-card">
        <a class="title" href="/web-proxy?url=${encodeURIComponent(`https://en.wikipedia.org/wiki/${encodeURIComponent(q)}`)}">Wikipedia: ${q}</a>
        <div class="url">https://en.wikipedia.org/wiki/${encodeURIComponent(q)}</div>
        <div class="snippet">Open live Wikipedia article for "${q}" directly on Stage.</div>
      </div>`;
    }

    responseHeaders.set("Content-Type", "text/html; charset=utf-8");
    return new NextResponse(buildGooglePortalHtml(parsed, q, resultsCards), {
      status: 200,
      headers: responseHeaders,
    });
  }

  // Reader Mode: fetches clean readable article content via Jina Reader API
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
    } catch {
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

      // Inject anti-frame-busting & navigation helper so clicking links or searching stays inside the stage proxy
      const helperScript = `<script>
        (function() {
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
