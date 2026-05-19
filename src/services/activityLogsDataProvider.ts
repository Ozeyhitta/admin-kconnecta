import type { DataProvider } from "ra-core";
import { apiClient } from "./axiosInstance";

type ActivityLogMethods = Pick<DataProvider, "getList">;

export const activityLogsDataProvider: ActivityLogMethods = {
  getList: async (_resource, params) => {
    const { page = 1, perPage = 20 } = params.pagination ?? {};
    const { field = "createdAt", order = "DESC" } = params.sort ?? {};
    const { q, actionType, excludeActionType, from, to } = params.filter ?? {};

    const { data } = await apiClient.get("/api/v1/admin/activity-logs", {
      params: {
        page: page - 1,
        size: perPage,
        sortBy: field,
        sortDir: order.toLowerCase(),
        ...(q ? { username: q } : {}),
        ...(actionType ? { actionType } : {}),
        ...(excludeActionType ? { excludeActionType } : {}),
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
      },
    });

    return { data: data.content, total: data.totalElements };
  },
};
