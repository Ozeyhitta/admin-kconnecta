import type { DataProvider } from "ra-core";
import { apiClient } from "./axiosInstance";
import { getPageContent, getPageTotal } from "./pagination";

type PostMethods = Pick<DataProvider, "getList" | "getOne" | "update" | "delete">;

export const postsDataProvider: PostMethods = {
  getList: async (_resource, params) => {
    const { page = 1, perPage = 20 } = params.pagination ?? {};
    const { field = "createdAt", order = "DESC" } = params.sort ?? {};
    const { q, status, authorId } = params.filter ?? {};

    const { data } = await apiClient.get("/api/v1/admin/posts", {
      params: {
        page: page - 1,
        size: perPage,
        sortBy: field,
        sortDir: order.toLowerCase(),
        ...(q ? { search: q } : {}),
        ...(status ? { status } : {}),
        ...(authorId ? { authorId } : {}),
      },
    });

    const items = getPageContent(data);
    return { data: items, total: getPageTotal(data, items.length) };
  },

  getOne: async (_resource, params) => {
    const { data } = await apiClient.get(`/api/v1/admin/posts/${params.id}`);
    return { data };
  },

  update: async (_resource, params) => {
    const { status } = params.data;
    await apiClient.patch(`/api/v1/admin/posts/${params.id}/status`, { status });
    const { data } = await apiClient.get(`/api/v1/admin/posts/${params.id}`);
    return { data };
  },

  delete: async (_resource, params) => {
    await apiClient.delete(`/api/v1/admin/posts/${params.id}`);
    return { data: { id: params.id } };
  },
};
