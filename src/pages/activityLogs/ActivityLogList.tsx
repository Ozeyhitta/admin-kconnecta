import * as React from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { List } from "@/components/admin";
import { ActivityLogSummaryCards } from "@/pages/dashboard/components/activityLogs/ActivityLogSummaryCards";
import { ActivityLogFilterBar } from "@/pages/dashboard/components/activityLogs/ActivityLogFilters";
import { ActivityLogList } from "@/pages/dashboard/components/activityLogs/ActivityLogList";
import { ActivityLogDetailDrawer } from "@/pages/dashboard/components/activityLogs/ActivityLogDetailDrawer";
import { resolveApiBaseUrl } from "@/services/axiosInstance";
import { cachedApiGet, DETAIL_CACHE_TTL } from "@/services/apiGetCache";
import { getAdminToken } from "@/lib/currentAdminUser";
import { getPageContent, getPageTotalPages } from "@/services/pagination";
import type { ActivityLogFilters as Filters, ActivityLogItem, ActivityLogPageResponse } from "@/pages/dashboard/components/activityLogs/types";

const PAGE_SIZE = 20;

function filtersFromSearchParams(searchParams: URLSearchParams): Filters {
  const value = (key: string) => searchParams.get(key) || undefined;
  return {
    username: value("username"),
    actionType: value("actionType"),
    status: value("status"),
    severity: value("severity"),
    from: value("from"),
    to: value("to"),
    abnormalOnly: searchParams.get("abnormalOnly") === "true" || undefined,
    timePreset: value("timePreset"),
  };
}

export const ActivityLogListPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = React.useState<Filters>(
    () => filtersFromSearchParams(searchParams),
  );
  const [page, setPage] = React.useState(0);
  const [data, setData] = React.useState<ActivityLogPageResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<ActivityLogItem | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const returnTo = (
    location.state
    && typeof location.state === "object"
    && "returnTo" in location.state
    && typeof location.state.returnTo === "string"
  )
    ? location.state.returnTo
    : null;

  const fetchPage = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await cachedApiGet<ActivityLogPageResponse>("/api/v1/admin/activity-logs", {
        params: {
          page,
          size: PAGE_SIZE,
          sortBy: "createdAt",
          sortDir: "desc",
          ...(filters.username ? { username: filters.username } : {}),
          ...(filters.actionType ? { actionType: filters.actionType } : {}),
          ...(filters.status ? { status: filters.status } : {}),
          ...(filters.severity ? { severity: filters.severity } : {}),
          ...(filters.from ? { from: filters.from } : {}),
          ...(filters.to ? { to: filters.to } : {}),
          ...(filters.abnormalOnly ? { abnormalOnly: true } : {}),
        },
      }, DETAIL_CACHE_TTL);
      setData(r.data);
    } catch {
      setError("Không tải được nhật ký hoạt động.");
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  React.useEffect(() => {
    void fetchPage();
  }, [fetchPage]);

  React.useEffect(() => {
    setPage(0);
  }, [filters]);

  const items = data ? getPageContent<ActivityLogItem>(data) : [];
  const totalPages = data ? getPageTotalPages(data, PAGE_SIZE) : 1;

  const handleExport = async () => {
    const token = getAdminToken();
    const base = resolveApiBaseUrl().replace(/\/$/, "");
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== "") params.set(k, String(v));
    });
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
    <List
      title="Nhật ký hoạt động"
      perPage={20}
      pagination={false}
      actions={false}
    >
      <div className="space-y-4 mb-6">
        {returnTo && (
          <button
            type="button"
            onClick={() => navigate(returnTo)}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại chi tiết trên Trang chủ
          </button>
        )}
        <ActivityLogSummaryCards summary={data?.summary} loading={loading} />
        <ActivityLogFilterBar filters={filters} onChange={setFilters} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => void handleExport()} className="text-sm underline text-muted-foreground hover:text-foreground">
            Xuất CSV
          </button>
        </div>
        <ActivityLogList
          items={items}
          loading={loading}
          error={error}
          onItemClick={item => { setSelected(item); setDrawerOpen(true); }}
        />
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 pt-2">
            <button type="button" disabled={page <= 0} onClick={() => setPage(p => p - 1)} className="text-sm px-3 py-1 border rounded disabled:opacity-40">Trước</button>
            <span className="text-sm text-muted-foreground self-center">Trang {page + 1} / {totalPages}</span>
            <button type="button" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="text-sm px-3 py-1 border rounded disabled:opacity-40">Sau</button>
          </div>
        )}
        <ActivityLogDetailDrawer item={selected} open={drawerOpen} onOpenChange={setDrawerOpen} />
      </div>
    </List>
  );
};

export default ActivityLogListPage;
