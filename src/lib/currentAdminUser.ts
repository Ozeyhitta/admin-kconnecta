export type LoggedInAdmin = {
  token?: string;
  id?: string;
  email?: string;
  role?: string;
};

export const getLoggedInAdmin = (): LoggedInAdmin | null => {
  const stored = localStorage.getItem("auth");
  if (!stored) return null;
  try {
    return JSON.parse(stored) as LoggedInAdmin;
  } catch {
    return null;
  }
};

export const getAdminToken = (): string | null => {
  const token = getLoggedInAdmin()?.token;
  return typeof token === "string" && token.length > 0 ? token : null;
};

export const getAdminAuthHeaders = (): Record<string, string> => {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const isCurrentAdminUser = (record?: { id?: string } | null) => {
  const auth = getLoggedInAdmin();
  if (!auth?.id || !record?.id) return false;
  return String(auth.id) === String(record.id);
};
