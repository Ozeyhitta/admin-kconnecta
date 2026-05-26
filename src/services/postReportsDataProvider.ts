import type { DataProvider } from "ra-core";
import { apiClient } from "./axiosInstance";

type PostReportMethods = Pick<DataProvider, "getList" | "getOne">;

export const postReportsDataProvider: PostReportMethods = {
  getList: async (_resource, params) => {
    const { page = 1, perPage = 20 } = params.pagination ?? {};
    const { field = "createdAt", order = "DESC" } = params.sort ?? {};
    const { q, postId } = params.filter ?? {};

    const { data } = await apiClient.get("/api/v1/admin/post-reports", {
      params: {
        page: page - 1,
        size: perPage,
        sortBy: field,
        sortDir: order.toLowerCase(),
        ...(q ? { search: q } : {}),
        ...(postId ? { postId } : {}),
      },
    });

    return { data: data.content, total: data.totalElements };
  },

  getOne: async (_resource, params) => {
    const { data } = await apiClient.get(`/api/v1/admin/post-reports/${params.id}`);
    return { data };
  },
};
