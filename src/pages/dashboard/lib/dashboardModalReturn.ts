import type { StatsDateRange } from "@/lib/statsDateRange";

export function dashboardModalReturnHref(
  modal: string,
  dateRange?: StatsDateRange,
  context?: Record<string, string | undefined>,
) {
  const params = new URLSearchParams({ modal });
  if (dateRange) {
    params.set("statsFrom", dateRange.from);
    params.set("statsTo", dateRange.to);
    params.set("statsPreset", dateRange.preset);
    params.set("statsCompare", dateRange.compareMode);
  }
  Object.entries(context ?? {}).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return `/home?${params.toString()}`;
}
