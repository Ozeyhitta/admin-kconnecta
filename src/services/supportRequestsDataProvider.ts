import type { DataProvider } from "ra-core";
import { apiClient } from "./axiosInstance";
import { getPageContent, getPageTotal } from "./pagination";

type SupportRequestMethods = Pick<DataProvider, "getList" | "getOne">;

export const supportRequestsDataProvider: SupportRequestMethods = {
  getList: async (_resource, params) => {
    const { page = 1, perPage = 20 } = params.pagination ?? {};
    const { field = "createdAt", order = "DESC" } = params.sort ?? {};
    const { q, category, status } = params.filter ?? {};

    const { data } = await apiClient.get("/api/v1/admin/support-requests", {
      params: {
        page: page - 1,
        size: perPage,
        sortBy: field,
        sortDir: order.toLowerCase(),
        ...(q ? { search: q } : {}),
        ...(category ? { category } : {}),
        ...(status ? { status } : {}),
      },
    });

    const items = getPageContent(data);
    return { data: items, total: getPageTotal(data, items.length) };
  },

  getOne: async (_resource, params) => {
    const { data } = await apiClient.get(`/api/v1/admin/support-requests/${params.id}`);
    return { data };
  },
};
