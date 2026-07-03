

export const fmt = new Intl.NumberFormat("vi-VN");

export const formatDay = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
  });

export const formatFullDay = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

export const formatDateTime = (iso: string | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const reportRatePercent = (reports: number, interactions: number): number | null => {
  if (interactions <= 0) return null;
  return (reports / interactions) * 100;
};



export const adminPostShowPath = (postId: string) => `/posts/${postId}/show`;


