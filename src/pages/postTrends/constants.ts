export const TREND_RANGE_OPTIONS = [
  { value: "7d" as const, label: "7 ngày" },
  { value: "30d" as const, label: "30 ngày" },
];

export const CHART_PALETTE = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6",
  "#ef4444", "#8b5cf6", "#14b8a6", "#f97316", "#0ea5e9",
];

export const TREND_FORMULA =
  "Điểm xu hướng = like×1 + comment×2 + share×3 − report×5. Chủ đề từ #hashtag hoặc từ khóa tự trích khi bài không có #.";

export const TOPIC_SOURCE_META: Record<
  string,
  { label: string; badgeClass: string; prefix: string }
> = {
  HASHTAG: {
    label: "Hashtag",
    prefix: "#",
    badgeClass:
      "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
  },
  KEYWORD: {
    label: "Từ khóa",
    prefix: "⌗",
    badgeClass:
      "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  },
  UNCATEGORIZED: {
    label: "Không phân loại",
    prefix: "—",
    badgeClass:
      "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  },
};

export const formatTopicLabel = (topic: string, source?: string): string => {
  if (source === "KEYWORD") return `⌗${topic}`;
  if (source === "UNCATEGORIZED" || topic === "khác") return "Không phân loại";
  return `#${topic}`;
};

export const trendLabelClass = (label: string): string => {
  switch (label) {
    case "Tăng mạnh":
      return "bg-success-bg text-success border-success-border font-semibold";
    case "Tăng":
      return "bg-success-bg text-success border-success-border";
    case "Giảm":
      return "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
  }
};
