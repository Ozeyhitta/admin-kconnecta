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

export const describeStatsRange = (range: StatsDateRange) => {
  const formatter = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" });
  const from = formatter.format(new Date(range.from));
  const to = formatter.format(new Date(range.to));
  return from === to ? from : `${from} - ${to}`;
};
