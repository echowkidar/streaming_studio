/** Read the current session token from storage (written by the auth store on login). */
export function getStoredToken(): string {
  if (typeof window === "undefined") return "";
  try {
    const direct = localStorage.getItem("livestudio_token");
    if (direct) return direct;
    const stored = JSON.parse(localStorage.getItem("livestudio_auth") || "{}");
    return stored?.state?.token || "";
  } catch {
    return "";
  }
}

export function authHeaders(): Record<string, string> {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
