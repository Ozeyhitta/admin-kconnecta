import type { ActivityLogItem, ActivityLogSummary, ActivityLogFilters as Filters } from "./types";

export type { ActivityLogItem, ActivityLogSummary, Filters };

export const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  SUCCESS:   { label: "Thành công",   className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  FAILED:    { label: "Thất bại",     className: "bg-red-100 text-red-700 border-red-200" },
  BLOCKED:   { label: "Bị chặn",      className: "bg-orange-100 text-orange-700 border-orange-200" },
  PENDING:   { label: "Đang xử lý",   className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
};

export const SEVERITY_LABELS: Record<string, { label: string; className: string }> = {
  INFO:     { label: "Thông tin",   className: "bg-slate-100 text-slate-600 border-slate-200" },
  WARNING:  { label: "Cảnh báo",   className: "bg-amber-100 text-amber-700 border-amber-200" },
  ERROR:    { label: "Lỗi",        className: "bg-red-100 text-red-800 border-red-200" },
  HIGH:     { label: "Lỗi",        className: "bg-red-100 text-red-800 border-red-200" },
  CRITICAL: { label: "Nghiêm trọng", className: "bg-red-200 text-red-900 border-red-400" },
};

export const ACTION_TYPE_OPTIONS = [
  { value: "LOGIN",                    label: "Đăng nhập" },
  { value: "LOGOUT",                   label: "Đăng xuất" },
  { value: "LOGIN_FAILED",             label: "Đăng nhập thất bại" },
  { value: "POST_CREATED",             label: "Tạo bài viết" },
  { value: "COMMENT_ADDED",            label: "Bình luận" },
  { value: "COMMENT_CREATED",          label: "Bình luận (mới)" },
  { value: "MESSAGE_SENT",             label: "Gửi tin nhắn" },
  { value: "MESSAGE_BLOCKED_SPAM",     label: "Tin nhắn bị chặn (spam)" },
  { value: "MESSAGE_BLOCKED_KEYWORD",  label: "Tin nhắn bị chặn (từ khóa)" },
  { value: "REPORT_CREATED",           label: "Tạo báo cáo" },
  { value: "ACCOUNT_LOCKED",           label: "Khóa tài khoản" },
  { value: "ACCOUNT_REVIEW_REQUESTED", label: "Yêu cầu mở khóa tài khoản" },
  { value: "CHAT_RESTRICTED",          label: "Hạn chế chat" },
  { value: "REACTION_ADDED",           label: "Cảm xúc" },
  { value: "POST_SHARED",              label: "Chia sẻ" },
  { value: "FRIEND_REQUEST_SENT",      label: "Kết bạn" },
];

export const timeFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
});

export const timeOnlyFormatter = new Intl.DateTimeFormat("vi-VN", {
  hour: "2-digit",
  minute: "2-digit",
});

const fmtShortDate = (d: Date) =>
  d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

export const dateGroupLabel = (iso: string): string => {
  const d = new Date(iso);
  const today     = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate();

  if (sameDay(d, today))     return `Hôm nay, ${fmtShortDate(d)}`;
  if (sameDay(d, yesterday)) return `Hôm qua, ${fmtShortDate(d)}`;
  return d.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export const groupLogsByDate = (items: ActivityLogItem[]): { label: string; items: ActivityLogItem[] }[] => {
  const map = new Map<string, ActivityLogItem[]>();
  for (const item of items) {
    const key = item.createdAt?.slice(0, 10) ?? "unknown";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries()).map(([dateKey, logs]) => ({
    label: logs[0]?.createdAt ? dateGroupLabel(logs[0].createdAt) : dateKey,
    items: logs,
  }));
};

// ── Time preset helpers ─────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, "0");
const fmtDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const TIME_PRESETS = [
  { value: "today",     label: "Hôm nay" },
  { value: "7days",     label: "7 ngày" },
  { value: "30days",    label: "30 ngày" },
  { value: "thisMonth", label: "Tháng này" },
  { value: "custom",    label: "Tuỳ chỉnh" },
] as const;

export type TimePreset = typeof TIME_PRESETS[number]["value"];

export const presetToDates = (preset: string): { from: string; to: string } | null => {
  const today = new Date();
  const todayStr = fmtDate(today);

  if (preset === "today")     return { from: todayStr, to: todayStr };
  if (preset === "7days")  {
    const from = new Date(today); from.setDate(today.getDate() - 6);
    return { from: fmtDate(from), to: todayStr };
  }
  if (preset === "30days") {
    const from = new Date(today); from.setDate(today.getDate() - 29);
    return { from: fmtDate(from), to: todayStr };
  }
  if (preset === "thisMonth") {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: fmtDate(from), to: todayStr };
  }
  return null; // custom — caller handles from/to
};
