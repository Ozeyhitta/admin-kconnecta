import * as React from "react";
import { Link } from "react-router";
import { Download, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolveApiBaseUrl } from "@/services/axiosInstance";
import {
  cachedApiGet,
  DASHBOARD_CACHE_TTL,
  invalidateApiGetCache,
} from "@/services/apiGetCache";
import { getAdminToken } from "@/lib/currentAdminUser";
import { ADMIN_ACTIVITY_POLL_MS, useIntervalPoll } from "@/lib/adminStatsPoll";
import { type StatsDateRange } from "@/lib/statsDateRange";
import { ActivityLogFilterBar } from "./ActivityLogFilters";
import { ActivityLogList } from "./ActivityLogList";
import { ActivityLogDetailDrawer } from "./ActivityLogDetailDrawer";
import { presetToDates } from "./activityLogConstants";
import type { ActivityLogFilters as Filters, ActivityLogItem, ActivityLogPageResponse } from "./types";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  dateRange?: StatsDateRange;
  compact?: boolean;
  pageSize?: number;
}

// ─── Quick summary ────────────────────────────────────────────────────────────

interface SummaryRow { label: string; count: number; warn?: boolean }

const QuickSummary = ({
  items,
  total,
  timePreset,
  loading,
}: {
  items: ActivityLogItem[];
  total: number;
  timePreset?: string;
  loading: boolean;
}) => {
  const rows: SummaryRow[] = React.useMemo(() => {
    const count = (types: string[]) => items.filter(i => types.includes(i.actionType)).length;
    const warnCount = items.filter(i => ["WARNING","ERROR","HIGH","CRITICAL"].includes(i.severity)).length;
    return [
      { label: "Tổng log",         count: total },
      { label: "Đăng nhập",        count: count(["LOGIN"]) },
      { label: "Đăng xuất",        count: count(["LOGOUT"]) },
      { label: "Tạo bài viết",     count: count(["POST_CREATED"]) },
      { label: "Bình luận",        count: count(["COMMENT_ADDED","COMMENT_CREATED"]) },
      { label: "Lỗi / cảnh báo",   count: warnCount, warn: warnCount > 0 },
    ];
  }, [items, total]);

  const title = timePreset === "today" ? "Tóm tắt hôm nay" : "Tóm tắt trong khoảng đã chọn";

  if (loading) return null;

  return (
    <div className="rounded-md border bg-muted/30 px-4 py-3 mb-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        {title}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1">
        {rows.map(row => (
          <div key={row.label} className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">{row.label}</span>
            <span className={`text-xs font-semibold tabular-nums ${row.warn ? "text-orange-600" : ""}`}>
              {row.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

// Default filters with today's date preset
const makeTodayFilters = (): Filters => {
  const dates = presetToDates("today")!;
  return { timePreset: "today", ...dates };
};

export const RecentActivityLogs = ({ compact = true, pageSize = 10 }: Props) => {
  const [filters, setFilters]         = React.useState<Filters>(makeTodayFilters);
  const [data, setData]               = React.useState<ActivityLogPageResponse | null>(null);
  const [loading, setLoading]         = React.useState(true);
  const [error, setError]             = React.useState<string | null>(null);
  const [selected, setSelected]       = React.useState<ActivityLogItem | null>(null);
  const [drawerOpen, setDrawerOpen]   = React.useState(false);
  const isFirstLoad = React.useRef(true);

  // Show skeleton on filter changes only (not background polls)
  React.useEffect(() => {
    if (isFirstLoad.current) return;
    setLoading(true);
    setData(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const fetchLogs = React.useCallback(async () => {
    setError(null);
    try {
      const r = await cachedApiGet<ActivityLogPageResponse>("/api/v1/admin/activity-logs", {
        params: {
          page: 0,
          size: pageSize,
          sortBy: "createdAt",
          sortDir: "desc",
          ...(filters.username    ? { username: filters.username }     : {}),
          ...(filters.actionType  ? { actionType: filters.actionType } : {}),
          ...(filters.status      ? { status: filters.status }         : {}),
          ...(filters.severity    ? { severity: filters.severity }     : {}),
          ...(filters.from        ? { from: filters.from }             : {}),
          ...(filters.to          ? { to: filters.to }                 : {}),
          ...(filters.abnormalOnly ? { abnormalOnly: true }            : {}),
        },
      }, DASHBOARD_CACHE_TTL);
      setData(r.data);
    } catch {
      setError("Không thể tải hoạt động gần đây. Vui lòng thử lại.");
    } finally {
      setLoading(false);
      isFirstLoad.current = false;
    }
  }, [filters, pageSize]);

  useIntervalPoll(fetchLogs, ADMIN_ACTIVITY_POLL_MS, [fetchLogs]);

  const items = data?.items ?? data?.content ?? [];
  const total = data?.pagination?.totalElements ?? data?.totalElements ?? items.length;

  const handleManualRefresh = () => {
    invalidateApiGetCache("/api/v1/admin/activity-logs");
    void fetchLogs();
  };

  const handleExport = async () => {
    const token = getAdminToken();
    const base = resolveApiBaseUrl().replace(/\/$/, "");
    const params = new URLSearchParams();
    if (filters.username)    params.set("username",    filters.username);
    if (filters.actionType)  params.set("actionType",  filters.actionType);
    if (filters.status)      params.set("status",      filters.status);
    if (filters.severity)    params.set("severity",    filters.severity);
    if (filters.from)        params.set("from",        filters.from);
    if (filters.to)          params.set("to",          filters.to);
    if (filters.abnormalOnly) params.set("abnormalOnly", "true");

    const res = await fetch(`${base}/api/v1/admin/activity-logs/export?${params}`, {
      headers: token ? { Authorization: `Bearer ${token}`, "X-Admin-Token": token } : {},
    });
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "activity-logs.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Hoạt động gần đây
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5"
            onClick={handleManualRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => void handleExport()}
          >
            <Download className="h-3.5 w-3.5" /> Xuất CSV
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5" asChild>
            <Link to="/activity-logs">
              <ExternalLink className="h-3.5 w-3.5" /> Xem tất cả log
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────────────── */}
      <ActivityLogFilterBar filters={filters} onChange={setFilters} compact={compact} />

      {/* ── Quick summary ──────────────────────────────────────────── */}
      <QuickSummary
        items={items}
        total={total}
        timePreset={filters.timePreset}
        loading={loading}
      />

      {/* ── Log list ───────────────────────────────────────────────── */}
      <ActivityLogList
        items={items}
        loading={loading}
        error={error}
        onItemClick={item => { setSelected(item); setDrawerOpen(true); }}
      />

      {/* ── Detail drawer ──────────────────────────────────────────── */}
      <ActivityLogDetailDrawer
        item={selected}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
};

export default RecentActivityLogs;
