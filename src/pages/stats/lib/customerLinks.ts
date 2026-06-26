import { apiClient } from "@/services/axiosInstance";
import { isUuid } from "@/services/idUtils";
import { getPageContent } from "@/services/pagination";

type AdminUserRecord = { id: string; username?: string | null };

const accountIdByUsername = new Map<string, Promise<string | null>>();

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
  if (userId && isUuid(userId)) {
    try {
      const { data } = await apiClient.get<AdminUserRecord>(`/api/v1/admin/users/${userId}`);
      if (data?.id && isUuid(data.id)) return data.id;
    } catch {
      // Not an account id — fall back to username lookup below.
    }
  }

  const normalizedUsername = username?.trim();
  if (!normalizedUsername) return null;

  return lookupAccountIdByUsername(normalizedUsername);
}
