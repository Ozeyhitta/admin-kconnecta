import { AuthProvider, HttpError } from "ra-core";
import { apiClient } from "../services/axiosInstance";

export const authProvider: AuthProvider = {
  login: async ({ email, password }) => {
    try {
      const { data } = await apiClient.post("/api/v1/admin/auth/login", {
        email,
        password,
      });
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
    localStorage.removeItem("auth");
    localStorage.setItem("not_authenticated", "true");

    const basename = (import.meta.env.VITE_BASENAME ?? "").replace(/\/$/, "");
    const loginPath = `${basename}/login`.replace(/\/+/g, "/") || "/login";
    window.location.replace(loginPath);

    // Skip client-side navigate so history is not kept for protected pages.
    return Promise.resolve(false);
  },

  checkError: (error) => {
    if (error?.status === 401 || error?.status === 403) {
      localStorage.removeItem("auth");
      return Promise.reject();
    }
    return Promise.resolve();
  },

  checkAuth: () => {
    return localStorage.getItem("auth") ? Promise.resolve() : Promise.reject();
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
