import type { DataProvider } from "ra-core";
import { apiClient } from "./axiosInstance";
import type { ActivityLogPageResponse } from "@/pages/dashboard/components/activityLogs/types";

type ActivityLogMethods = Pick<DataProvider, "getList">;

export const activityLogsDataProvider: ActivityLogMethods = {
  getList: async (_resource, params) => {
    const { page = 1, perPage = 20 } = params.pagination ?? {};
    const { field = "createdAt", order = "DESC" } = params.sort ?? {};
    const { q, actionType, status, severity, from, to, abnormalOnly } = params.filter ?? {};

    const { data } = await apiClient.get<ActivityLogPageResponse>("/api/v1/admin/activity-logs", {
      params: {
        page: page - 1,
        size: perPage,
        sortBy: field,
        sortDir: order.toLowerCase(),
        ...(q ? { username: q } : {}),
        ...(actionType ? { actionType } : {}),
        ...(status ? { status } : {}),
        ...(severity ? { severity } : {}),
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
        ...(abnormalOnly ? { abnormalOnly: true } : {}),
      },
    });

    const items = data.items ?? data.content ?? [];
    return {
      data: items as never[],
      total: data.pagination?.totalElements ?? data.totalElements ?? items.length,
    };
  },
};
