export type StatsRangePreset =
  | "today"
  | "last7"
  | "last30"
  | "thisMonth"
  | "thisQuarter"
  | "thisYear"
  | "specificDate"
  | "custom";

export type StatsCompareMode =
  | "none"
  | "previous_period"
  | "previous_week"
  | "previous_month"
  | "previous_year";

export interface StatsDateRange {
  preset: StatsRangePreset;
  from: string;
  to: string;
  compareMode: StatsCompareMode;
}

const pad = (value: number) => String(value).padStart(2, "0");

export const formatDateInput = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const startOfQuarter = (date: Date) => {
  const quarterMonth = Math.floor(date.getMonth() / 3) * 3;
  return new Date(date.getFullYear(), quarterMonth, 1);
};

export const getPresetRange = (preset: Exclude<StatsRangePreset, "custom" | "specificDate">): Pick<StatsDateRange, "from" | "to"> => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const to = formatDateInput(today);

  if (preset === "today") {
    return { from: to, to };
  }
  if (preset === "last7") {
    const from = new Date(today);
    from.setDate(today.getDate() - 6);
    return { from: formatDateInput(from), to };
  }
  if (preset === "last30") {
    const from = new Date(today);
    from.setDate(today.getDate() - 29);
    return { from: formatDateInput(from), to };
  }
  if (preset === "thisMonth") {
    return { from: formatDateInput(new Date(today.getFullYear(), today.getMonth(), 1)), to };
  }
  if (preset === "thisQuarter") {
    return { from: formatDateInput(startOfQuarter(today)), to };
  }
  return { from: formatDateInput(new Date(today.getFullYear(), 0, 1)), to };
};

export const createDefaultStatsDateRange = (): StatsDateRange => ({
  preset: "last30",
  ...getPresetRange("last30"),
  compareMode: "previous_period",
});

export const toStatsApiParams = (range: StatsDateRange) => {
  const params: Record<string, string> = { from: range.from, to: range.to };
  if (range.compareMode !== "none") params.compareMode = range.compareMode;
  return params;
};

export interface StatsAdvancedFilters {
  interactionType: string;
  userSegment: string;
  interactionSource: string;
}

export const toStatsAdvancedApiParams = (filters: StatsAdvancedFilters) => {
  const params: Record<string, string> = {};
  if (filters.interactionType !== "all") params.interactionTypes = filters.interactionType;
  if (filters.userSegment !== "all") params.userSegment = filters.userSegment;
  if (filters.interactionSource !== "all") params.interactionSource = filters.interactionSource;
  return params;
};

export const toEngagementAnalyticsApiParams = (
  range: StatsDateRange,
  filters: StatsAdvancedFilters,
) => ({
  ...toStatsApiParams(range),
  ...toStatsAdvancedApiParams(filters),
});

export const describeStatsRange = (range: StatsDateRange) => {
  const formatter = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" });
  const from = formatter.format(new Date(range.from));
  const to = formatter.format(new Date(range.to));
  return from === to ? from : `${from} - ${to}`;
};

/** Returns the {from, to} date strings for the comparison period, or null if compareMode is "none". */
export const getComparisonRange = (range: StatsDateRange): { from: string; to: string } | null => {
  if (range.compareMode === "none") return null;

  const fromDate = new Date(range.from + "T00:00:00");
  const toDate   = new Date(range.to   + "T00:00:00");

  if (range.compareMode === "previous_period") {
    const durationDays =
      Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000) + 1;
    const prevTo   = new Date(fromDate); prevTo.setDate(prevTo.getDate() - 1);
    const prevFrom = new Date(fromDate); prevFrom.setDate(prevFrom.getDate() - durationDays);
    return { from: formatDateInput(prevFrom), to: formatDateInput(prevTo) };
  }

  if (range.compareMode === "previous_month") {
    const prevFrom = new Date(fromDate); prevFrom.setMonth(prevFrom.getMonth() - 1);
    const prevTo   = new Date(toDate);   prevTo.setMonth(prevTo.getMonth()   - 1);
    return { from: formatDateInput(prevFrom), to: formatDateInput(prevTo) };
  }

  return null;
};

export const describeCompareLabel = (compareMode: StatsCompareMode): string => {
  if (compareMode === "previous_period") return "kỳ trước";
  if (compareMode === "previous_month")  return "cùng kỳ tháng trước";
  return "";
};
