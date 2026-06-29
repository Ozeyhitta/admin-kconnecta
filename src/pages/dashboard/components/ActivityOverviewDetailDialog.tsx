import * as React from "react";
import { cachedApiGet, DETAIL_CACHE_TTL } from "@/services/apiGetCache";
import { toStatsApiParams, describeStatsRange, type StatsDateRange } from "@/lib/statsDateRange";
import {
  AdminDetailModal,
  AdminDetailSidebar,
  InsightCard,
  MetricHeroCard,
  SectionCard,
} from "@/components/admin/admin-detail-modal";
import { InteractionBreakdown } from "@/pages/stats/components/InteractionBreakdown";
import { ActivityLogSidebarList } from "@/pages/stats/components/ActivityLogListItem";
import {
  INTERACTION_TYPE_TO_ACTION,
  type EngagementAnalyticsResponse,
  type InteractionBreakdownItem,
} from "@/pages/stats/types";
import type { ActivityLogItem, ActivityLogPageResponse } from "./activityLogs/types";
import { dashboardModalReturnHref } from "../lib/dashboardModalReturn";

const fmt = new Intl.NumberFormat("vi-VN");

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateRange: StatsDateRange;
  onTypeDrillDown?: (item: InteractionBreakdownItem) => void;
};

export function ActivityOverviewDetailDialog({
  open,
  onOpenChange,
  dateRange,
  onTypeDrillDown,
}: Props) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<EngagementAnalyticsResponse | null>(null);
  const [logs, setLogs] = React.useState<ActivityLogItem[]>([]);
  const [logsLoading, setLogsLoading] = React.useState(false);

  const handleTypeClick = React.useCallback((item: InteractionBreakdownItem) => {
    const actionType = INTERACTION_TYPE_TO_ACTION[item.type];
    if (!actionType || !onTypeDrillDown) return;
    onOpenChange(false);
    onTypeDrillDown(item);
  }, [onOpenChange, onTypeDrillDown]);

  React.useEffect(() => {
    if (!open) {
      setData(null);
      setLogs([]);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLogsLoading(true);
    setError(null);

    const params = toStatsApiParams(dateRange);

    void Promise.all([
      cachedApiGet<EngagementAnalyticsResponse>(
        "/api/v1/admin/stats/engagement-analytics",
        { params },
        DETAIL_CACHE_TTL,
      ),
      cachedApiGet<ActivityLogPageResponse>("/api/v1/admin/activity-logs", {
        params: {
          page: 0,
          size: 20,
          sortBy: "createdAt",
          sortDir: "desc",
          from: dateRange.from,
          to: dateRange.to,
        },
      }, DETAIL_CACHE_TTL),
    ])
      .then(([analyticsRes, logsRes]) => {
        if (cancelled) return;
        setData(analyticsRes.data);
        setLogs(logsRes.data.items ?? logsRes.data.content ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          setLogs([]);
          setError("Không tải được chi tiết hoạt động.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setLogsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, dateRange]);

  const interactions = data?.interactions;

  const left = interactions ? (
    <>
      <MetricHeroCard
        label="Tổng hoạt động"
        value={fmt.format(interactions.summary.totalInteractions)}
        sub={
          interactions.summary.averageInteractionsPerDay > 0
            ? `Trung bình ${fmt.format(interactions.summary.averageInteractionsPerDay)} lượt/ngày`
            : undefined
        }
      />

      <SectionCard title="Phân bổ theo loại">
        <InteractionBreakdown
          breakdown={interactions.breakdown}
          summary={interactions.summary}
          onTypeClick={handleTypeClick}
          typeClickHint="Nhấn loại để xem chi tiết"
        />
      </SectionCard>

      <InsightCard title="Ghi chú" tone="muted">
        Tổng hoạt động có thể bao gồm thêm các loại hành động khác ngoài 5 loại tương tác chính
        (đăng nhập, báo cáo, v.v.).
      </InsightCard>
    </>
  ) : null;

  const sidebar = (
    <AdminDetailSidebar
      title="Hoạt động gần đây"
      subtitle={logsLoading ? "Đang tải…" : `${fmt.format(logs.length)} mục trong kỳ`}
      viewAllHref="/activity-logs"
      viewAllState={{
        returnTo: dashboardModalReturnHref("activity-overview", dateRange),
      }}
      onViewAll={() => onOpenChange(false)}
    >
      <ActivityLogSidebarList
        logs={logs}
        onNavigate={() => onOpenChange(false)}
        linkState={{ returnTo: dashboardModalReturnHref("activity-overview", dateRange) }}
        emptyMessage="Không có hoạt động gần đây trong kỳ đã chọn."
      />
    </AdminDetailSidebar>
  );

  return (
    <AdminDetailModal
      open={open}
      onOpenChange={onOpenChange}
      title="Chi tiết tổng hoạt động"
      description={`${describeStatsRange(dateRange)} · Phân bổ theo loại hành động`}
      loading={loading}
      error={error}
      left={left}
      sidebar={sidebar}
    />
  );
}
