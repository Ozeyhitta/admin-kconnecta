import { apiClient, resolveApiBaseUrl } from "@/services/axiosInstance";
import { authDebug } from "@/lib/authDebug";
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

export function redirectToLogin(reason?: "session"): void {
  clearAuthSession();
  const loginPath = getLoginPath();
  const suffix = reason === "session" ? "?reason=session" : "";
  const target = `${loginPath}${suffix}`.replace(/\/+/g, "/");
  authDebug("redirect_to_login", { reason: reason ?? "none", target });
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
    const timeout = isLocalBackend ? 8_000 : 60_000;
    authDebug("validate_session_start", { apiBase: apiBase || "(vite proxy)", timeout });
    const res = await apiClient.get("/api/v1/admin/stats/online", {
      timeout,
      headers: { "Cache-Control": "no-cache" },
      validateStatus: () => true,
    });
    if (res.status === 401 || res.status === 403) {
      return "invalid";
    }
    if (res.status >= 400) {
      authDebug("validate_session_ok", { note: "stats_non_ok_but_authenticated", status: res.status });
    }
    authDebug("validate_session_ok", { status: res.status });
    return "ok";
  } catch (error: unknown) {
    const err = error as { response?: { status?: number }; code?: string; message?: string };
    const status = err?.response?.status;
    authDebug("validate_session_error", {
      status: status ?? "no_response",
      code: err?.code,
      message: err?.message,
    });
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
