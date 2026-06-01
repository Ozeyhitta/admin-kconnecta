import * as React from "react";
import { Link } from "react-router";
import { Download, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/services/axiosInstance";
import { getAdminToken } from "@/lib/currentAdminUser";
import { ADMIN_ACTIVITY_POLL_MS, useIntervalPoll } from "@/lib/adminStatsPoll";
import { toStatsApiParams, type StatsDateRange } from "@/lib/statsDateRange";
import { ActivityLogSummaryCards } from "./ActivityLogSummaryCards";
import { ActivityLogFilterBar } from "./ActivityLogFilters";
import { ActivityLogList } from "./ActivityLogList";
import { ActivityLogDetailDrawer } from "./ActivityLogDetailDrawer";
import type { ActivityLogFilters as Filters, ActivityLogItem, ActivityLogPageResponse } from "./types";

interface Props {
  dateRange?: StatsDateRange;
  compact?: boolean;
  pageSize?: number;
}

export const RecentActivityLogs = ({ dateRange, compact = true, pageSize = 10 }: Props) => {
  const [filters, setFilters] = React.useState<Filters>({});
  const [data, setData]       = React.useState<ActivityLogPageResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError]     = React.useState<string | null>(null);
  const [selected, setSelected]     = React.useState<ActivityLogItem | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const isFirstLoad = React.useRef(true);

  // Show skeleton only when filter/dateRange changes (not on background polls)
  React.useEffect(() => {
    if (isFirstLoad.current) return;
    setLoading(true);
    setData(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, filters]);

  const fetchLogs = React.useCallback(async () => {
    setError(null);
    try {
      const rangeParams = dateRange ? toStatsApiParams(dateRange) : {};
      const r = await apiClient.get<ActivityLogPageResponse>("/api/v1/admin/activity-logs", {
        params: {
          page: 0,
          size: pageSize,
          sortBy: "createdAt",
          sortDir: "desc",
          ...rangeParams,
          ...(filters.username    ? { username: filters.username }       : {}),
          ...(filters.actionType  ? { actionType: filters.actionType }   : {}),
          ...(filters.status      ? { status: filters.status }           : {}),
          ...(filters.severity    ? { severity: filters.severity }       : {}),
          ...(filters.from        ? { from: filters.from }               : {}),
          ...(filters.to          ? { to: filters.to }                   : {}),
          ...(filters.abnormalOnly ? { abnormalOnly: true }              : {}),
        },
      });
      setData(r.data);
    } catch {
      setError("Không tải được nhật ký hoạt động. Vui lòng thử lại.");
    } finally {
      setLoading(false);
      isFirstLoad.current = false;
    }
  }, [dateRange, filters, pageSize]);

  // useIntervalPoll runs immediately on first mount and on dep changes — no separate useEffect needed
  useIntervalPoll(fetchLogs, ADMIN_ACTIVITY_POLL_MS, [fetchLogs]);

  const items = data?.items ?? data?.content ?? [];

  const handleManualRefresh = () => {
    void fetchLogs();
  };

  const handleExport = async () => {
    const token = getAdminToken();
    const base = (import.meta.env.VITE_API_URL ?? "http://localhost:8082").replace(/\/$/, "");
    const params = new URLSearchParams();
    if (filters.username)   params.set("username", filters.username);
    if (filters.actionType) params.set("actionType", filters.actionType);
    if (filters.status)     params.set("status", filters.status);
    if (filters.severity)   params.set("severity", filters.severity);
    if (filters.from)       params.set("from", filters.from);
    if (filters.to)         params.set("to", filters.to);
    if (filters.abnormalOnly) params.set("abnormalOnly", "true");
    if (dateRange?.from)    params.set("from", dateRange.from);
    if (dateRange?.to)      params.set("to", dateRange.to);

    const res = await fetch(`${base}/api/v1/admin/activity-logs/export?${params}`, {
      headers: token ? { Authorization: `Bearer ${token}`, "X-Admin-Token": token } : {},
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "activity-logs.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Hoạt động gần đây
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={handleManualRefresh} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => void handleExport()}>
            <Download className="h-3.5 w-3.5" /> Xuất CSV
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5" asChild>
            <Link to="/activity-logs">
              <ExternalLink className="h-3.5 w-3.5" /> Xem tất cả log
            </Link>
          </Button>
        </div>
      </div>

      {!compact && <ActivityLogSummaryCards summary={data?.summary} loading={loading} />}

      <ActivityLogFilterBar filters={filters} onChange={setFilters} compact={compact} />

      <ActivityLogList
        items={items}
        loading={loading}
        error={error}
        onItemClick={item => {
          setSelected(item);
          setDrawerOpen(true);
        }}
      />

      <ActivityLogDetailDrawer
        item={selected}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
};

export default RecentActivityLogs;
