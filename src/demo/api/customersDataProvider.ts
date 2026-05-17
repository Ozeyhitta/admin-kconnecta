import type { DataProvider } from "ra-core";
import { apiClient } from "./axiosInstance";

type CustomerMethods = Pick<
  DataProvider,
  "getList" | "getOne" | "update" | "getMany"
>;

export const customersDataProvider: CustomerMethods = {
  getList: async (_resource, params) => {
    const { page, perPage } = params.pagination;
    const { field, order } = params.sort;
    const { q, status, role } = params.filter ?? {};

    const { data } = await apiClient.get("/api/v1/admin/users", {
      params: {
        page: page - 1,
        size: perPage,
        sortBy: field === "createdAt" ? "createdAt" : field,
        sortDir: order.toLowerCase(),
        ...(q ? { search: q } : {}),
        ...(status ? { status } : {}),
        ...(role ? { role } : {}),
      },
    });

    return { data: data.content, total: data.totalElements };
  },

  getOne: async (_resource, params) => {
    const { data } = await apiClient.get(`/api/v1/admin/users/${params.id}`);
    return { data };
  },

  update: async (_resource, params) => {
    const { status, role, newPassword } = params.data;

    if (newPassword) {
      await apiClient.put(`/api/v1/admin/users/${params.id}/password`, {
        newPassword,
      });
    }
    if (status && status !== params.previousData?.status) {
      await apiClient.patch(`/api/v1/admin/users/${params.id}/status`, {
        status,
      });
    }
    if (role && role !== params.previousData?.role) {
      await apiClient.patch(`/api/v1/admin/users/${params.id}/role`, { role });
    }

    const { data } = await apiClient.get(`/api/v1/admin/users/${params.id}`);
    return { data };
  },

  getMany: async (_resource, params) => {
    const results = await Promise.all(
      params.ids.map((id) => apiClient.get(`/api/v1/admin/users/${id}`)),
    );
    return { data: results.map((r) => r.data) };
  },
};
