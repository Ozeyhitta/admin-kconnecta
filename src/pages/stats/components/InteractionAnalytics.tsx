import * as React from "react";
import { Activity, Zap, ArrowUp, ArrowRight, ArrowDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InteractionTrendChart } from "./InteractionTrendChart";
import { InteractionBreakdown } from "./InteractionBreakdown";
import { InteractionDetailDialog } from "./InteractionDetailDialog";
import { AnalyticsInsightCards } from "./AnalyticsInsightCards";
import { AnalyticsKpiCard, growthToComparison } from "./AnalyticsKpiCard";
import { computeInteractionAlerts } from "../lib/interactionAlerts";
import type { StatsDateRange } from "@/lib/statsDateRange";
import {
  INTERACTION_TYPE_TO_ACTION,
  type AnalyticsChartPoint,
  type InteractionAnalytics,
  type InteractionBreakdownItem,
  type InteractionChartSelection,
  type StatsActiveFilters,
} from "../types";

const fmt = new Intl.NumberFormat("vi-VN");
const fmtOneDecimal = new Intl.NumberFormat("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

interface InteractionAnalyticsProps {
  data: InteractionAnalytics | null;
  loading: boolean;
  dateRange: StatsDateRange;
  /** Mẫu nhỏ (MAU < ngưỡng): ẩn kết luận xu hướng để không diễn giải nhiễu. */
  lowData?: boolean;
  activeFilters: StatsActiveFilters;
  hasActiveAdvancedFilters?: boolean;
  onInteractionTypeSelect?: (actionType: string) => void;
}

const GROWTH_STRONG_UP = 20;
const GROWTH_LIGHT_UP = 5;
const GROWTH_STABLE_MIN = -5;
const GROWTH_LIGHT_DOWN = -20;

export const InteractionAnalyticsSection = ({
  data,
  loading,
  dateRange,
  lowData,
  activeFilters,
  hasActiveAdvancedFilters = false,
  onInteractionTypeSelect,
}: InteractionAnalyticsProps) => {
  const s = data?.summary;
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [selection, setSelection] = React.useState<InteractionChartSelection | null>(null);
  const trend = getTrendPresentation(s?.interactionGrowthRate ?? null);
  const peakHigherThanAverage = React.useMemo(() => {
    if (s == null || s.averageInteractionsPerDay <= 0) return null;
    const growth = ((s.peakInteractionCount - s.averageInteractionsPerDay) / s.averageInteractionsPerDay) * 100;
    return growth > 0 ? growth : 0;
  }, [s]);
  const interactionTypeLabel = getInteractionTypeFilterLabel(activeFilters.interactionType);
  const userSegmentLabel = getUserSegmentFilterLabel(activeFilters.userSegment);
  const interactionSourceLabel = getInteractionSourceFilterLabel(activeFilters.interactionSource);
  const breakdownEmptyMessage = hasActiveAdvancedFilters
    ? "Không có dữ liệu tương tác phù hợp với bộ lọc đã chọn."
    : "Chưa có tương tác trong kỳ này";
  const breakdownHasDelta = React.useMemo(
    () => (data?.breakdown ?? []).some(
      (item) => item.deltaPercentage != null || typeof item.previousCount === "number",
    ),
    [data?.breakdown],
  );
  const periodComparison = lowData ? null : growthToComparison(s?.interactionGrowthRate);

  const openDayDetail = React.useCallback((point: AnalyticsChartPoint) => {
    setSelection({ kind: "day", date: point.date, label: point.label });
    setDetailOpen(true);
  }, []);

  const handleTypeFilter = React.useCallback((item: InteractionBreakdownItem) => {
    const actionType = INTERACTION_TYPE_TO_ACTION[item.type] ?? item.type;
    onInteractionTypeSelect?.(actionType);
  }, [onInteractionTypeSelect]);

  const interactionAlerts = React.useMemo(() => {
    if (data == null) return null;
    return computeInteractionAlerts(data.summary, data.breakdown, data.chartData);
  }, [data]);

  // Mẫu nhỏ: chỉ giữ ghi chú cảnh báo/trung tính, bỏ các kết luận tăng (success) / giảm (danger).
  const shownInsights = interactionAlerts == null
    ? null
    : lowData
      ? interactionAlerts.filter((i) => i.level === "warning" || i.level === "info")
      : interactionAlerts;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Lượt tương tác &amp; tăng trưởng</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Tổng hợp hành vi tương tác theo thời gian và loại hành động.</p>
      </div>

      {/* 1. Overview KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <AnalyticsKpiCard
          title="Tổng tương tác"
          tooltip="Tổng số lượt tương tác ghi nhận trong toàn bộ kỳ đã chọn."
          value={s?.totalInteractions}
          loading={loading}
          format={(v) => `${fmt.format(v)} lượt`}
          icon={Activity}
          iconColor="text-amber-500"
          comparison={periodComparison}
        />
        <AnalyticsKpiCard
          title="TB/ngày"
          tooltip="Số lượt tương tác trung bình mỗi ngày trong kỳ (tổng tương tác ÷ số ngày)."
          value={s?.averageInteractionsPerDay}
          loading={loading}
          format={(v) => `${fmtOneDecimal.format(v)} lượt/ngày`}
          icon={Activity}
          iconColor="text-orange-500"
          comparison={periodComparison}
        />
        <AnalyticsKpiCard
          title="Đỉnh trong kỳ"
          tooltip="Ngày có số lượt tương tác cao nhất trong kỳ, kèm mức cao hơn trung bình ngày."
          value={s?.peakInteractionCount}
          loading={loading}
          format={(v) => `${fmt.format(v)} lượt`}
          icon={Zap}
          iconColor="text-yellow-500"
          comparison={
            peakHigherThanAverage != null && peakHigherThanAverage > 0
              ? { label: `Cao hơn TB ${fmtOneDecimal.format(peakHigherThanAverage)}%`, tone: "positive" }
              : { label: "So với trung bình ngày", tone: "neutral" }
          }
          sub={s?.peakInteractionDay
            ? new Date(s.peakInteractionDay).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
            : undefined}
        />
        <AnalyticsKpiCard
          title="Xu hướng tương tác"
          tooltip="Đánh giá mức thay đổi lượt tương tác so với kỳ trước theo ngưỡng tăng/giảm."
          value={lowData ? "—" : trend.label}
          loading={loading}
          isText
          icon={lowData ? ArrowRight : trend.icon}
          iconColor={lowData ? "text-slate-600" : trend.color}
          comparison={lowData ? null : trend.comparison}
          sub={!lowData ? trend.evaluation : undefined}
        />
      </div>

      {!loading && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="secondary">Loại: {interactionTypeLabel}</Badge>
          <Badge variant="secondary">Nhóm: {userSegmentLabel}</Badge>
          <Badge variant="secondary">Nguồn: {interactionSourceLabel}</Badge>
          {!lowData && (
            <span className="text-muted-foreground">
              Quy tắc: Tăng mạnh {">"} +20% · Tăng nhẹ +5% đến +20% · Ổn định -5% đến +5% · Giảm nhẹ -5% đến -20% · Giảm mạnh {"<"} -20%.
            </span>
          )}
        </div>
      )}

      {/* 2. Main chart */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <h3 className="text-sm font-semibold mb-4">Lượt tương tác theo ngày</h3>
          <InteractionTrendChart
            chartData={data?.chartData ?? null}
            summary={s ?? null}
            dateRange={dateRange}
            activeFilters={activeFilters}
            loading={loading}
            onDayClick={openDayDetail}
          />
        </CardContent>
      </Card>

      {/* 3. Analysis & alerts */}
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Phân tích &amp; cảnh báo tương tác</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Màu sắc: xanh = tốt, cam = cần chú ý, đỏ = cảnh báo, xanh dương = thông tin.
          </p>
        </div>
        <AnalyticsInsightCards
          insights={shownInsights}
          loading={loading}
          limit={4}
          emptyMessage="Tương tác ổn định — không có cảnh báo trong kỳ này."
        />
      </div>

      {/* 4. Detailed breakdown */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <h3 className="text-sm font-semibold mb-1">Chi tiết theo loại tương tác</h3>
          <p className="text-xs text-muted-foreground mb-4">
            {breakdownHasDelta
              ? "Phân bổ từng loại hành động và % thay đổi so với kỳ trước."
              : "Phân bổ từng loại hành động trong kỳ đã chọn."}
          </p>
          <InteractionBreakdown
            breakdown={data?.breakdown ?? []}
            summary={s ?? null}
            loading={loading}
            emptyMessage={breakdownEmptyMessage}
            activeInteractionType={activeFilters.interactionType}
            onTypeClick={onInteractionTypeSelect ? handleTypeFilter : undefined}
          />
        </CardContent>
      </Card>

      <InteractionDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        dateRange={dateRange}
        activeFilters={activeFilters}
        selection={selection}
        chartData={data?.chartData ?? null}
        averageInteractionsPerDay={s?.averageInteractionsPerDay}
      />
    </section>
  );
};

function getTrendPresentation(growthRate: number | null): {
  label: "Tăng mạnh" | "Tăng nhẹ" | "Ổn định" | "Giảm nhẹ" | "Giảm mạnh";
  evaluation: string;
  comparison: ReturnType<typeof growthToComparison>;
  icon: React.FC<{ className?: string }>;
  color: string;
} {
  const comparison = growthToComparison(growthRate);
  if (growthRate == null) {
    return {
      label: "Ổn định",
      evaluation: "Đánh giá: ổn định",
      comparison,
      icon: ArrowRight,
      color: "text-slate-600",
    };
  }
  if (growthRate > GROWTH_STRONG_UP) {
    return {
      label: "Tăng mạnh",
      evaluation: "Đánh giá: tốt",
      comparison,
      icon: ArrowUp,
      color: "text-emerald-600",
    };
  }
  if (growthRate > GROWTH_LIGHT_UP) {
    return {
      label: "Tăng nhẹ",
      evaluation: "Đánh giá: ổn định",
      comparison,
      icon: ArrowUp,
      color: "text-emerald-500",
    };
  }
  if (growthRate >= GROWTH_STABLE_MIN) {
    return {
      label: "Ổn định",
      evaluation: "Đánh giá: ổn định",
      comparison,
      icon: ArrowRight,
      color: "text-sky-700",
    };
  }
  if (growthRate >= GROWTH_LIGHT_DOWN) {
    return {
      label: "Giảm nhẹ",
      evaluation: "Đánh giá: cần xem nguyên nhân",
      comparison,
      icon: ArrowDown,
      color: "text-orange-600",
    };
  }
  return {
    label: "Giảm mạnh",
    evaluation: "Đánh giá: cần xem nguyên nhân",
    comparison,
    icon: ArrowDown,
    color: "text-red-600",
  };
}

function getInteractionTypeFilterLabel(value: string) {
  if (value === "COMMENT_ADDED") return "Bình luận";
  if (value === "REACTION_ADDED") return "Cảm xúc";
  if (value === "POST_CREATED") return "Bài đăng";
  if (value === "POST_SHARED") return "Chia sẻ";
  if (value === "FRIEND_REQUEST_SENT") return "Kết bạn";
  return "Tất cả";
}

function getUserSegmentFilterLabel(value: string) {
  if (value === "new") return "Người dùng mới";
  if (value === "returning") return "Người dùng cũ";
  if (value === "core") return "Người dùng hoạt động cao";
  if (value === "inactive_risk") return "Người dùng ít hoạt động";
  return "Tất cả";
}

function getInteractionSourceFilterLabel(value: string) {
  if (value === "mobile") return "Mobile";
  if (value === "web") return "Web";
  if (value === "admin") return "Admin";
  if (value === "other") return "Khác";
  return "Tất cả";
}

export default InteractionAnalyticsSection;
