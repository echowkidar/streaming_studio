"use client";

/**
 * Attaches the logged-in user's Bearer token to every same-origin `/api/...` fetch.
 *
 * The API now requires authentication on all studio/broadcast/media routes, and many components call
 * `fetch("/api/...")` directly. Patching once here (at module load, before any component effect runs)
 * keeps those calls working without touching each one. Requests that already set Authorization are left alone.
 */
import { getStoredToken } from "@/lib/authToken";

declare global {
  interface Window {
    __livestudioFetchPatched?: boolean;
  }
}

function isSameOriginApi(input: RequestInfo | URL): boolean {
  try {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(raw, window.location.href);
    return url.origin === window.location.origin && url.pathname.startsWith("/api/");
  } catch {
    return false;
  }
}

if (typeof window !== "undefined" && !window.__livestudioFetchPatched) {
  window.__livestudioFetchPatched = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (!isSameOriginApi(input)) return originalFetch(input, init);
    const token = getStoredToken();
    if (!token) return originalFetch(input, init);

    const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
    if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
    return originalFetch(input, { ...init, headers });
  };
}

export function AuthFetchBootstrap() {
  return null;
}
