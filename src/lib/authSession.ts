import { apiClient, resolveApiBaseUrl } from "@/services/axiosInstance";

const AUTH_STORAGE_KEY = "auth";

export function getLoginPath(): string {
  const basename = (import.meta.env.VITE_BASENAME ?? "").replace(/\/$/, "");
  const path = `${basename}/login`.replace(/\/+/g, "/");
  return path.startsWith("/") ? path : `/${path}`;
}

export function hasStoredAuth(): boolean {
  const stored = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!stored) return false;
  try {
    const parsed = JSON.parse(stored) as { token?: string };
    return typeof parsed.token === "string" && parsed.token.length > 0;
  } catch {
    return false;
  }
}

export function clearAuthSession(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.setItem("not_authenticated", "true");
}

export function redirectToLogin(reason?: "backend" | "session"): void {
  clearAuthSession();
  const loginPath = getLoginPath();
  const suffix =
    reason === "backend"
      ? "?reason=backend"
      : reason === "session"
        ? "?reason=session"
        : "";
  const target = `${loginPath}${suffix}`.replace(/\/+/g, "/");
  if (window.location.pathname + window.location.search !== target) {
    window.location.replace(target);
  }
}

export function isLoginPath(pathname: string): boolean {
  const loginPath = getLoginPath();
  return pathname === loginPath || pathname.endsWith("/login");
}

function isNetworkFailure(error: unknown): boolean {
  if (!error || typeof error !== "object") return true;
  const err = error as { code?: string; message?: string; response?: unknown };
  if (err.response !== undefined) return false;
  const code = err.code ?? "";
  const message = String(err.message ?? "").toLowerCase();
  return (
    code === "ERR_NETWORK" ||
    code === "ECONNABORTED" ||
    message.includes("network error") ||
    message.includes("failed to fetch")
  );
}

export type AuthSessionStatus = "ok" | "missing" | "invalid" | "backend_down";

/** Validates token against admin API. */
export async function validateAuthSession(): Promise<AuthSessionStatus> {
  if (!hasStoredAuth()) return "missing";

  try {
    const apiBase = resolveApiBaseUrl();
    const isLocalBackend = !apiBase || apiBase.includes("localhost");
    await apiClient.get("/api/v1/admin/stats/online", {
      timeout: isLocalBackend ? 8_000 : 60_000,
      headers: { "Cache-Control": "no-cache" },
    });
    return "ok";
  } catch (error: unknown) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 401 || status === 403) {
      return "invalid";
    }
    if (isNetworkFailure(error)) {
      return "backend_down";
    }
    // Other API errors still mean backend responded — treat as authenticated.
    return "ok";
  }
}
