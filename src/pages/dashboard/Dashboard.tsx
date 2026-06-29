import { Translate } from "ra-core";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { Breadcrumb, BreadcrumbPage } from "@/components/admin";
import { StatsDateFilter } from "@/components/admin/stats-date-filter";
import { createDefaultStatsDateRange, type StatsDateRange } from "@/lib/statsDateRange";

import Welcome from "./Welcome";
import { SystemOverviewCards } from "./SystemOverviewCards";
import StatsOverview from "./StatsOverview";
import { ActivityHourCard, ActivityDayCard } from "./OrderChart";
import { NewUsersAnalytics } from "./NewUsersAnalytics";

// ─── useDebouncedValue ────────────────────────────────────────────────────────
// Returns the value after `delay` ms of no changes.
// The filter UI updates immediately (instant feel); API calls fire after debounce.

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer.current);
  }, [value, delay]);

  return debounced;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const Dashboard = () => {
  const [searchParams] = useSearchParams();
  const [dateRange, setDateRange] = useState<StatsDateRange>(() => {
    const fallback = createDefaultStatsDateRange();
    const from = searchParams.get("statsFrom");
    const to = searchParams.get("statsTo");
    if (!from || !to) return fallback;
    return {
      ...fallback,
      from,
      to,
      preset: (searchParams.get("statsPreset") as StatsDateRange["preset"]) || "custom",
      compareMode:
        (searchParams.get("statsCompare") as StatsDateRange["compareMode"])
        || fallback.compareMode,
    };
  });

  // Debounce filter changes by 300 ms to prevent simultaneous API storms
  // when user rapidly switches presets or types custom dates.
  // The <StatsDateFilter> receives the immediate value for responsive UI.
  const debouncedDateRange = useDebouncedValue(dateRange, 300);

  return (
    <>
      <Breadcrumb>
        <BreadcrumbPage>
          <Translate i18nKey="ra.page.dashboard">Home</Translate>
        </BreadcrumbPage>
      </Breadcrumb>

      <Welcome />

      <div className="mb-8">
        <SystemOverviewCards />
      </div>

      <div className="mb-8 flex flex-col gap-8">
        {/* Filter gets immediate value — instant UI feedback */}
        <StatsDateFilter value={dateRange} onChange={setDateRange} />
        {/* Analytics components get debounced value — fewer API calls */}
        <StatsOverview dateRange={debouncedDateRange} />
      </div>

      <div className="mb-8">
        <div className="flex flex-col gap-10">
          <NewUsersAnalytics dateRange={debouncedDateRange} />
          <ActivityHourCard dateRange={debouncedDateRange} />
          <ActivityDayCard dateRange={debouncedDateRange} />
        </div>
      </div>
    </>
  );
};

export default Dashboard;
