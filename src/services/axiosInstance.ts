import axios, { AxiosHeaders } from "axios";
import { getAdminToken } from "@/lib/currentAdminUser";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8082",
  headers: {
    "Content-Type": "application/json",
  },
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
