import axios, { AxiosHeaders } from "axios";
import { getAdminToken } from "@/lib/currentAdminUser";
import { clearAuthSession, getLoginPath, isLoginPath } from "@/lib/authSession";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8082",
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
    }
    return Promise.reject(error);
  },
);
