import * as React from "react";
import { cachedApiGet, DETAIL_CACHE_TTL } from "@/services/apiGetCache";
import { describeStatsRange, type StatsDateRange } from "@/lib/statsDateRange";
import { getPageContent, getPageTotal, getPageTotalPages } from "@/services/pagination";
import {
  AdminDetailModal,
  AdminDetailSidebar,
  AdminDetailSidebarPagination,
  InsightCard,
  MetricHeroCard,
} from "@/components/admin/admin-detail-modal";
import { ActivityLogSidebarList } from "@/pages/stats/components/ActivityLogListItem";
import type { ActivityLogItem, ActivityLogPageResponse } from "./activityLogs/types";

const fmt = new Intl.NumberFormat("vi-VN");
const PAGE_SIZE = 20;

function loginActivityLogHref(
  dateRange: StatsDateRange,
  username?: string | null,
) {
  const params = new URLSearchParams({
    actionType: "LOGIN",
    from: dateRange.from,
    to: dateRange.to,
    timePreset: "custom",
  });
  if (username) params.set("username", username);
  return `/activity-logs?${params.toString()}`;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateRange: StatsDateRange;
  totalLogins?: number;
  returnTo?: string;
};

export function LoginDetailDialog({ open, onOpenChange, dateRange, totalLogins, returnTo }: Props) {
  const [page, setPage] = React.useState(0);
  const [logsLoading, setLogsLoading] = React.useState(false);
  const [logsError, setLogsError] = React.useState<string | null>(null);
  const [logs, setLogs] = React.useState<ActivityLogItem[]>([]);
  const [totalCount, setTotalCount] = React.useState<number | null>(null);
  const [totalPages, setTotalPages] = React.useState(1);

  React.useEffect(() => {
    if (!open) {
      setPage(0);
      setLogs([]);
      setTotalCount(null);
      setTotalPages(1);
      setLogsError(null);
      return;
    }
  }, [open]);

  React.useEffect(() => {
    setPage(0);
  }, [dateRange.from, dateRange.to]);

  React.useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLogsLoading(true);
    setLogsError(null);

    void cachedApiGet<ActivityLogPageResponse>("/api/v1/admin/activity-logs", {
        params: {
          page,
          size: PAGE_SIZE,
          sortBy: "createdAt",
          sortDir: "desc",
          actionType: "LOGIN",
          from: dateRange.from,
          to: dateRange.to,
        },
      }, DETAIL_CACHE_TTL)
      .then((res) => {
        if (cancelled) return;
        const items = getPageContent(res.data);
        const total = getPageTotal(res.data, items.length);
        setLogs(items);
        setTotalCount(total);
        setTotalPages(getPageTotalPages(res.data, PAGE_SIZE, 1));
      })
      .catch(() => {
        if (!cancelled) {
          setLogs([]);
          setTotalCount(null);
          setTotalPages(1);
          setLogsError("Không tải được danh sách đăng nhập gần đây.");
        }
      })
      .finally(() => {
        if (!cancelled) setLogsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, dateRange, page]);

  const displayTotal = totalLogins ?? totalCount ?? 0;
  const viewAllHref = loginActivityLogHref(dateRange);

  const left = (
    <>
      <MetricHeroCard
        label="Lượt đăng nhập"
        value={fmt.format(displayTotal)}
        sub="Tổng số lần đăng nhập thành công trong kỳ đã chọn"
      />

      <InsightCard title="Ghi chú" tone="muted">
        Mỗi lần người dùng đăng nhập thành công được ghi nhận một lượt. Cùng một người có thể
        đăng nhập nhiều lần trong kỳ.
      </InsightCard>
    </>
  );

  const sidebar = (
    <AdminDetailSidebar
      title="Đăng nhập gần đây"
      subtitle={
        logsLoading
          ? "Đang tải…"
          : totalCount != null
            ? `${fmt.format(totalCount)} lượt trong kỳ`
            : `${fmt.format(logs.length)} mục`
      }
      viewAllHref={viewAllHref}
      viewAllState={returnTo ? { returnTo } : undefined}
      onViewAll={() => onOpenChange(false)}
      footer={
        totalCount != null && totalCount > 0 ? (
          <AdminDetailSidebarPagination
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            disabled={logsLoading}
          />
        ) : null
      }
    >
      {logsLoading ? (
        <p className="text-sm text-muted-foreground text-center py-16">Đang tải danh sách…</p>
      ) : logsError ? (
        <p className="text-sm text-destructive text-center py-16 px-4">{logsError}</p>
      ) : (
        <ActivityLogSidebarList
          key={page}
          logs={logs}
          onNavigate={() => onOpenChange(false)}
          getHref={(log) => loginActivityLogHref(dateRange, log.username)}
          linkState={returnTo ? { returnTo } : undefined}
          emptyMessage="Không có lượt đăng nhập trong kỳ đã chọn."
        />
      )}
    </AdminDetailSidebar>
  );

  return (
    <AdminDetailModal
      open={open}
      onOpenChange={onOpenChange}
      title="Chi tiết lượt đăng nhập"
      description={`${describeStatsRange(dateRange)} · Chỉ tính đăng nhập thành công`}
      left={left}
      sidebar={sidebar}
    />
  );
}
