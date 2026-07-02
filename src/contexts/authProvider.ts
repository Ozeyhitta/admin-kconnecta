import { AuthProvider, HttpError } from "ra-core";
import { apiClient, resolveApiBaseUrl } from "../services/axiosInstance";
import {
  clearAuthSession,
  hasStoredAuth,
  redirectToLogin,
  validateAuthSession,
} from "@/lib/authSession";
import { authDebug } from "@/lib/authDebug";

export const authProvider: AuthProvider = {
  login: async ({ email, password }) => {
    authDebug("login_start", { apiBase: resolveApiBaseUrl() || "(vite proxy)", email });
    try {
      const { data } = await apiClient.post("/api/v1/admin/auth/login", {
        email,
        password,
      });
      if (!data?.token || typeof data.token !== "string") {
        authDebug("login_error", { reason: "missing_token" });
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
      authDebug("login_ok", { email: data.email, role: data.role });
      return Promise.resolve();
    } catch (error: any) {
      localStorage.setItem("not_authenticated", "true");
      if (!error?.response) {
        authDebug("login_error", {
          reason: "network",
          code: error?.code,
          message: error?.message,
        });
        const message =
          "Không kết nối được Admin API. Kiểm tra https://admin-kconnecta.onrender.com/actuator/health rồi thử lại.";
        return Promise.reject(new HttpError(message, 503, { message }));
      }
      const status = error.response?.status ?? 401;
      authDebug("login_error", { reason: "http", status, message: error.response?.data?.message });
      const message =
        error.response?.data?.message ??
        (status === 404
          ? "Tài khoản admin không tồn tại"
          : "Email hoặc mật khẩu không đúng");
      return Promise.reject(new HttpError(message, status, { message }));
    }
  },

  logout: async () => {
    try {
      await apiClient.post("/api/v1/admin/auth/logout");
    } catch {
      // Ignored - still proceed to logout locally
    }
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

  checkAuth: async () => {
    if (!hasStoredAuth()) {
      return Promise.reject(new Error());
    }

    const status = await validateAuthSession();
    if (status === "ok" || status === "backend_down") {
      return Promise.resolve();
    }

    clearAuthSession();
    return Promise.reject(new Error());
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
