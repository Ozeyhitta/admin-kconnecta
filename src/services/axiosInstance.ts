import axios, { AxiosHeaders } from "axios";
import { getAdminToken } from "@/lib/currentAdminUser";
import { clearAuthSession, getLoginPath, isLoginPath } from "@/lib/authSession";
import { authDebug } from "@/lib/authDebug";

const PRODUCTION_API_URL = "https://admin-kconnecta.onrender.com";

export function resolveApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL?.trim();
  if (configured) return configured;
  return import.meta.env.DEV ? "" : PRODUCTION_API_URL;
}

export const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30_000,
});

authDebug("api_client_init", { baseURL: resolveApiBaseUrl() || "(vite proxy)" });

apiClient.interceptors.request.use((config) => {
  authDebug("api_request", {
    method: config.method,
    url: config.url,
    baseURL: config.baseURL,
  });
  const token = getAdminToken();
  if (!token) return config;

  const headers = AxiosHeaders.from(config.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("X-Admin-Token", token);
  config.headers = headers;
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    authDebug("api_response", { status: response.status, url: response.config.url });
    return response;
  },
  (error) => {
    const status = error?.response?.status;
    authDebug("api_error", {
      status: status ?? "no_response",
      code: error?.code,
      message: error?.message,
      url: error?.config?.url,
      detail: error?.response?.data,
    });
    // Only force re-login on auth errors — network/timeouts are handled per screen.
    if (status === 401 || status === 403) {
      clearAuthSession();
      if (!isLoginPath(window.location.pathname)) {
        window.location.replace(`${getLoginPath()}?reason=session`);
      }
    }
    return Promise.reject(error);
  },
);
