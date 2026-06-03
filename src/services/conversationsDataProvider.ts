import type { DataProvider } from "ra-core";
import { apiClient } from "./axiosInstance";
import { getPageContent, getPageTotal } from "./pagination";

type ConversationMethods = Pick<DataProvider, "getList" | "getOne">;

export const conversationsDataProvider: ConversationMethods = {
  getList: async (_resource, params) => {
    const { page = 1, perPage = 20 } = params.pagination ?? {};
    const { field = "lastMessageAt", order = "DESC" } = params.sort ?? {};
    const { q } = params.filter ?? {};

    const { data } = await apiClient.get("/api/v1/admin/conversations", {
      params: {
        page: page - 1,
        size: perPage,
        sortBy: field,
        sortDir: order.toLowerCase(),
        ...(q ? { q } : {}),
      },
    });

    const items = getPageContent(data);
    return { data: items, total: getPageTotal(data, items.length) };
  },

  getOne: async (_resource, params) => {
    const { data } = await apiClient.get(`/api/v1/admin/conversations/${params.id}`);
    return { data: { ...data, id: params.id } };
  },
};
