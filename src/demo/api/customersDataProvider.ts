import type { DataProvider } from "ra-core";
import { apiClient } from "./axiosInstance";
import { isUuid } from "./idUtils";

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
    if (!isUuid(params.id)) return { data: { id: params.id } };
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
    const uuidIds = params.ids.filter(isUuid);
    if (uuidIds.length === 0) {
      return { data: [] };
    }

    if (uuidIds.length === 1) {
      const { data } = await apiClient.get(`/api/v1/admin/users/${uuidIds[0]}`);
      return { data: [data] };
    }

    const { data } = await apiClient.get("/api/v1/admin/users/batch", {
      params: { ids: uuidIds },
    });
    return { data };
  },
};
