import { apiClient } from "@/services/axiosInstance";
import type { ActivityLogPageResponse } from "@/pages/dashboard/components/activityLogs/types";
import { lookupAccountIdForActivityUser } from "./customerLinks";

export type DauDayUser = {
  /** Profile id from activity logs (`users.id`). */
  userId: string;
  /** Account id for `/customers/:id/show` — null when lookup fails. */
  accountId: string | null;
  username?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
};

const PAGE_SIZE = 200;

function getPageItems(data: ActivityLogPageResponse) {
  return data.items ?? data.content ?? [];
}

function getTotalPages(data: ActivityLogPageResponse) {
  return data.pagination?.totalPages ?? data.totalPages ?? 1;
}

/** Distinct active users on a day via activity-logs (matches backend DAU user_id semantics). */
export async function fetchDauDayUsers(
  date: string,
  expectedCount?: number,
): Promise<DauDayUser[]> {
  const users = new Map<string, DauDayUser>();
  let page = 0;
  let totalPages = 1;

  while (page < totalPages) {
    const { data } = await apiClient.get<ActivityLogPageResponse>("/api/v1/admin/activity-logs", {
      params: {
        from: date,
        to: date,
        page,
        size: PAGE_SIZE,
        sortBy: "createdAt",
        sortDir: "desc",
      },
    });

    for (const item of getPageItems(data)) {
      if (!item.userId || users.has(item.userId)) continue;
      users.set(item.userId, {
        userId: item.userId,
        accountId: null,
        username: item.username,
        fullName: item.fullName,
        avatarUrl: item.avatarUrl,
      });
    }

    totalPages = getTotalPages(data);
    page += 1;

    if (expectedCount != null && users.size >= expectedCount) break;
  }

  const list = Array.from(users.values());
  const accountIds = await Promise.all(
    list.map((user) => lookupAccountIdForActivityUser(user.userId, user.username)),
  );

  return list
    .map((user, index) => ({ ...user, accountId: accountIds[index] }))
    .sort((a, b) => displayName(a).localeCompare(displayName(b), "vi"));
}

function displayName(user: DauDayUser) {
  return user.fullName ?? user.username ?? user.userId;
}
