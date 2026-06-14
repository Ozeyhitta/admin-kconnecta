import { resolveApiBaseUrl } from "@/services/axiosInstance";
import { authDebug } from "@/lib/authDebug";

/** Ping Render/local admin backend (no auth). */
export async function checkAdminApiHealth(timeoutMs = 20_000): Promise<boolean> {
  const base = resolveApiBaseUrl().replace(/\/$/, "");
  if (!base) {
    authDebug("health_check_skip", { reason: "vite_proxy" });
    return true;
  }

  const url = `${base}/actuator/health`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    authDebug("health_check_start", { url, timeoutMs });
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    clearTimeout(timer);
    const body = (await res.json()) as { status?: string };
    const ok = res.ok && body.status === "UP";
    authDebug("health_check_result", { ok, httpStatus: res.status, bodyStatus: body.status });
    return ok;
  } catch (error) {
    authDebug("health_check_result", {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
