import { AuthProvider, HttpError } from "ra-core";
import { apiClient } from "../services/axiosInstance";
import {
  clearAuthSession,
  hasStoredAuth,
  redirectToLogin,
} from "@/lib/authSession";

export const authProvider: AuthProvider = {
  login: async ({ email, password }) => {
    try {
      const { data } = await apiClient.post("/api/v1/admin/auth/login", {
        email,
        password,
      });
      if (!data?.token || typeof data.token !== "string") {
        return Promise.reject(
          new HttpError("Đăng nhập không trả về token", 500, { message: "Đăng nhập không trả về token" }),
        );
      }
      localStorage.setItem(
        "auth",
        JSON.stringify({
          token: data.token,
          id: data.id,
          email: data.email,
          role: data.role,
        }),
      );
      localStorage.removeItem("not_authenticated");
      return Promise.resolve();
    } catch (error: any) {
      localStorage.setItem("not_authenticated", "true");
      const status = error.response?.status ?? 401;
      const message =
        error.response?.data?.message ?? "Invalid email or password";
      return Promise.reject(new HttpError(message, status, { message }));
    }
  },

  logout: () => {
    redirectToLogin();
    return Promise.resolve(false);
  },

  checkError: (error) => {
    const status = error?.status ?? error?.response?.status;
    if (status === 401 || status === 403) {
      clearAuthSession();
      redirectToLogin("session");
      return Promise.reject(error);
    }
    return Promise.resolve();
  },

  checkAuth: () => {
    return hasStoredAuth() ? Promise.resolve() : Promise.reject();
  },

  getPermissions: () => {
    const stored = localStorage.getItem("auth");
    if (!stored) return Promise.resolve(undefined);
    const { role } = JSON.parse(stored);
    return Promise.resolve(role);
  },

  getIdentity: () => {
    const stored = localStorage.getItem("auth");
    if (!stored) return Promise.reject();
    const { id, email } = JSON.parse(stored);
    return Promise.resolve({ id, fullName: email, email });
  },
};
