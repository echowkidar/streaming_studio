const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface RequestOptions extends RequestInit {
  data?: unknown;
}

export async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<{ success: boolean; data?: T; error?: string }> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  
  let token = "";
  if (typeof window !== "undefined") {
    token = localStorage.getItem("livestudio_token") || "";
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
