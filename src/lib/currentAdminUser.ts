export type LoggedInAdmin = {
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

export const isCurrentAdminUser = (record?: { id?: string } | null) => {
  const auth = getLoggedInAdmin();
  if (!auth?.id || !record?.id) return false;
  return String(auth.id) === String(record.id);
};
