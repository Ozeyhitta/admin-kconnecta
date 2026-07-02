import type { DataProvider } from "ra-core";
import { HttpError } from "ra-core";
import { apiClient } from "./axiosInstance";
import { isUuid } from "./idUtils";
import { isCurrentAdminUser } from "@/lib/currentAdminUser";
import { getPageContent, getPageTotal } from "./pagination";

type CustomerMethods = Pick<
  DataProvider,
  "getList" | "getOne" | "update" | "getMany"
>;

export const customersDataProvider: CustomerMethods = {
  getList: async (_resource, params) => {
    const { page = 1, perPage = 20 } = params.pagination ?? {};
    const { field = "createdAt", order = "DESC" } = params.sort ?? {};
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

    const items = getPageContent(data);
    return { data: items, total: getPageTotal(data, items.length) };
  },

  getOne: async (_resource, params) => {
    if (!isUuid(params.id)) return { data: { id: params.id } };
    const { data } = await apiClient.get(`/api/v1/admin/users/${params.id}`);
    return { data };
  },

  update: async (_resource, params) => {
    if (isCurrentAdminUser({ id: String(params.id) }) || isCurrentAdminUser(params.previousData)) {
      throw new HttpError(
        "Không thể thay đổi tài khoản của chính bạn",
        403,
        { message: "Không thể thay đổi tài khoản của chính bạn" },
      );
    }

    const { status, newPassword, newEmail, lockDays, role } = params.data;

    if (newPassword) {
      await apiClient.put(`/api/v1/admin/users/${params.id}/password`, { newPassword });
    }
    if (status && status !== params.previousData?.status) {
      const body =
        status === "BLOCKED" ? { status, lockDays: lockDays ?? null } : { status };
      await apiClient.patch(`/api/v1/admin/users/${params.id}/status`, body);
    }
    if (newEmail) {
      await apiClient.put(`/api/v1/admin/users/${params.id}/email`, { newEmail });
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
