import { getAdminToken } from "@/lib/currentAdminUser";

const baseURL = (import.meta.env.VITE_API_URL ?? "http://localhost:8082").replace(/\/$/, "");

export class AdminApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function adminPost<T = void>(path: string, body: unknown): Promise<T> {
  const token = getAdminToken();
  if (!token) {
    throw new AdminApiError("Chưa đăng nhập", 401);
  }

  const url = `${baseURL}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = (await res.json()) as { message?: string };
      if (data.message) message = data.message;
    } catch {
      try { message = await res.text(); } catch { /* keep statusText */ }
    }
    throw new AdminApiError(message || "Request failed", res.status);
  }

  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}
