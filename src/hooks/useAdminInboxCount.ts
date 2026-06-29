import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/services/axiosInstance";
import {
  getAdminInboxSeenAt,
  markAdminInboxSeen,
  subscribeAdminInboxSeen,
} from "@/lib/adminInboxSeen";
import { ADMIN_INBOX_POLL_MS, useIntervalPoll } from "@/lib/adminStatsPoll";

export function useAdminInboxCount() {
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    try {
      const seenAt = getAdminInboxSeenAt();
      const { data } = await apiClient.get<{ count: number }>(
        "/api/v1/admin/notifications/inbox-count",
        { params: seenAt ? { since: seenAt } : undefined },
      );
      setCount(data?.count ?? 0);
    } catch {
      setCount(0);
    }
  }, []);

  useIntervalPoll(fetchCount, ADMIN_INBOX_POLL_MS, [fetchCount]);

  useEffect(() => {
    subscribeAdminInboxSeen(() => setCount(0));
  }, []);

  const acknowledgeInbox = useCallback(() => {
    markAdminInboxSeen();
  }, []);

  return { count, acknowledgeInbox, refreshCount: fetchCount };
}
