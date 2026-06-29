import type { DataProvider } from "ra-core";
import { apiClient } from "./axiosInstance";
import { getPageContent, getPageTotal } from "./pagination";

type CommentMethods = Pick<DataProvider, "getList" | "getOne" | "delete">;

export const commentsDataProvider: CommentMethods = {
  getList: async (_resource, params) => {
    const { page = 1, perPage = 20 } = params.pagination ?? {};
    const { field = "createdAt", order = "DESC" } = params.sort ?? {};
    const { q, postId, authorId, status } = params.filter ?? {};

    const { data } = await apiClient.get("/api/v1/admin/comments", {
      params: {
        page: page - 1,
        size: perPage,
        sortBy: field,
        sortDir: order.toLowerCase(),
        ...(q ? { search: q } : {}),
        ...(postId ? { postId } : {}),
        ...(authorId ? { authorId } : {}),
        ...(status ? { status } : {}),
      },
    });

    const items = getPageContent(data);
    return { data: items, total: getPageTotal(data, items.length) };
  },

  getOne: async (_resource, params) => {
    const { data } = await apiClient.get(`/api/v1/admin/comments/${params.id}`);
    return { data };
  },

  delete: async (_resource, params) => {
    await apiClient.delete(`/api/v1/admin/comments/${params.id}`);
    return { data: { id: params.id } as any };
  },
};
