import { getLoggedInAdmin } from "@/lib/currentAdminUser";

const STORAGE_PREFIX = "admin_inbox_seen_at";

type InboxSeenListener = () => void;
const listeners = new Set<InboxSeenListener>();

const storageKey = () => {
  const adminId = getLoggedInAdmin()?.id;
  return adminId ? `${STORAGE_PREFIX}_${adminId}` : STORAGE_PREFIX;
};

export const getAdminInboxSeenAt = (): string | null => {
  try {
    return localStorage.getItem(storageKey());
  } catch {
    return null;
  }
};

export const markAdminInboxSeen = (): string => {
  const seenAt = new Date().toISOString();
  try {
    localStorage.setItem(storageKey(), seenAt);
  } catch {
    /* ignore quota errors */
  }
  listeners.forEach((listener) => listener());
  return seenAt;
};

export const subscribeAdminInboxSeen = (listener: InboxSeenListener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
