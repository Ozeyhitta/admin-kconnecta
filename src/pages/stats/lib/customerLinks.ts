import { apiClient } from "@/services/axiosInstance";
import { isUuid } from "@/services/idUtils";
import { getPageContent } from "@/services/pagination";

export type AdminUserRecord = {
  id: string;
  username?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
};

const accountIdByUsername = new Map<string, Promise<string | null>>();
const accountByActivityUser = new Map<string, Promise<AdminUserRecord | null>>();

/** Admin customer show route — `id` must be an account UUID from `/api/v1/admin/users`. */
export function resolveCustomerShowHref(accountId: string | null | undefined): string | null {
  if (!accountId || !isUuid(accountId)) return null;
  return `/customers/${accountId}/show`;
}

async function lookupAccountIdByUsername(username: string): Promise<string | null> {
  const key = username.toLowerCase();
  let pending = accountIdByUsername.get(key);
  if (!pending) {
    pending = (async () => {
      const { data } = await apiClient.get("/api/v1/admin/users", {
        params: {
          search: username,
          page: 0,
          size: 20,
          sortBy: "createdAt",
          sortDir: "desc",
        },
      });
      const items = getPageContent<AdminUserRecord>(data);
      const match = items.find((u) => u.username === username);
      return match?.id && isUuid(match.id) ? match.id : null;
    })();
    accountIdByUsername.set(key, pending);
  }
  return pending;
}

/**
 * Activity logs expose `userId` as the profile id (`users.id`), while the customers
 * resource expects the account id (`accounts.id`). Resolve the account id for linking.
 */
export async function lookupAccountIdForActivityUser(
  userId: string | null | undefined,
  username?: string | null,
): Promise<string | null> {
  const user = await lookupAdminUserForActivityUser(userId, username);
  return user?.id ?? null;
}

export async function lookupAdminUserForActivityUser(
  userId: string | null | undefined,
  username?: string | null,
): Promise<AdminUserRecord | null> {
  if (userId && isUuid(userId)) {
    let pending = accountByActivityUser.get(userId);
    if (!pending) {
      pending = (async () => {
        try {
          const { data } = await apiClient.get<AdminUserRecord>(
            `/api/v1/admin/users/by-profile/${userId}`,
          );
          if (data?.id && isUuid(data.id)) return data;
        } catch {
          // Some callers may already provide an account id.
        }
        try {
          const { data } = await apiClient.get<AdminUserRecord>(`/api/v1/admin/users/${userId}`);
          return data?.id && isUuid(data.id) ? data : null;
        } catch {
          return null;
        }
      })();
      accountByActivityUser.set(userId, pending);
    }
    const resolved = await pending;
    if (resolved) return resolved;
  }

  const normalizedUsername = username?.trim();
  if (!normalizedUsername) return null;

  const accountId = await lookupAccountIdByUsername(normalizedUsername);
  if (!accountId) return null;
  try {
    const { data } = await apiClient.get<AdminUserRecord>(`/api/v1/admin/users/${accountId}`);
    return data?.id ? data : null;
  } catch {
    return null;
  }
}
