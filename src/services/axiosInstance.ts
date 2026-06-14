import axios, { AxiosHeaders } from "axios";
import { getAdminToken } from "@/lib/currentAdminUser";
import { clearAuthSession, getLoginPath, isLoginPath } from "@/lib/authSession";

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

apiClient.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (!token) return config;

  const headers = AxiosHeaders.from(config.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("X-Admin-Token", token);
  config.headers = headers;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      clearAuthSession();
      if (!isLoginPath(window.location.pathname)) {
        window.location.replace(getLoginPath());
      }
    } else if (!error?.response) {
      clearAuthSession();
      if (!isLoginPath(window.location.pathname)) {
        window.location.replace(`${getLoginPath()}?reason=backend`);
      }
    }
    return Promise.reject(error);
  },
);
