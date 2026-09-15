function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && (envUrl.startsWith("http://") || envUrl.startsWith("https://"))) {
    return envUrl.replace(/\/+$/, "").replace(/\/api$/, "");
  }

  // In browser, use relative path so requests go through Nginx reverse proxy (/api/...)
  if (typeof window !== "undefined") {
    return "";
  }

  // Server-side fallback
  return process.env.API_INTERNAL_URL || "http://localhost:4000";
}

interface RequestOptions extends RequestInit {
  data?: unknown;
}

export async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<{ success: boolean; data?: T; error?: string }> {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = baseUrl ? `${baseUrl.replace(/\/+$/, "")}${cleanEndpoint}` : cleanEndpoint;
  
  let token = "";
  if (typeof window !== "undefined") {
    token = localStorage.getItem("livestudio_token") || "";
    if (!token) {
      try {
        const stored = JSON.parse(localStorage.getItem("livestudio_auth") || "{}");
        token = stored?.state?.token || "";
      } catch {}
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  const config: RequestInit = {
    ...options,
    headers,
  };

  if (options.data) {
    config.body = JSON.stringify(options.data);
  }

  try {
    const res = await fetch(url, config);
    const result = await res.json().catch(() => ({}));
    
    if (!res.ok) {
      if (res.status === 401 && typeof window !== "undefined" && !endpoint.includes("/auth/login")) {
        if (result.error === "SESSION_REVOKED") {
          localStorage.removeItem("livestudio_token");
          localStorage.removeItem("livestudio_auth");
          window.location.href = "/login";
        }
      }

      return {
        success: false,
        error: result.error || `HTTP error ${res.status}`,
      };
    }

    return {
      success: true,
      data: result.data || result,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}
