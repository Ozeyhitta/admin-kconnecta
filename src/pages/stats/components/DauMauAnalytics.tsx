import * as React from "react";
import { UserCheck, Users, TrendingUp, TrendingDown, Minus, BarChart3, ArrowUp, ArrowRight, ArrowDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DauTrendChart } from "./DauTrendChart";
import { DauDayDetailDialog } from "./DauDayDetailDialog";
import { AnalyticsInsightCards } from "./AnalyticsInsightCards";
import { AnalyticsKpiCard, growthToComparison } from "./AnalyticsKpiCard";
import { RatioGauge } from "./RatioGauge";
import type { AnalyticsChartPoint, DauMauAnalytics } from "../types";

const fmt = new Intl.NumberFormat("vi-VN");
const DAU_MAU_GOOD = 40;
const DAU_MAU_WARNING = 20;
const GROWTH_STABLE_MIN = -5;
const GROWTH_STABLE_MAX = 5;
const GROWTH_SOFT_MAX = 20;
const GROWTH_STRONG_MIN = -20;

const TREND_ICON: Record<string, React.FC<{ className?: string }>> = {
  "Tăng": TrendingUp,
  "Giảm": TrendingDown,
  "Giảm cuối kỳ": TrendingDown,
  "Không ổn định": Minus,
  "Ổn định": Minus,
};

interface DauMauAnalyticsProps {
  data: DauMauAnalytics | null;
  loading: boolean;
  /** Mẫu nhỏ (MAU < ngưỡng): ẩn gauge + kết luận xu hướng để không diễn giải nhiễu. */
  lowData?: boolean;
}

export const DauMauAnalyticsSection = ({ data, loading, lowData }: DauMauAnalyticsProps) => {
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [selectedDay, setSelectedDay] = React.useState<AnalyticsChartPoint | null>(null);
  const s = data?.summary;

  const openDayDetail = React.useCallback((point: AnalyticsChartPoint) => {
    setSelectedDay(point);
    setDetailOpen(true);
  }, []);
  const dauMauAnalyticsRatio = s && s.mau30Days > 0 ? (s.averageDau30Days / s.mau30Days) * 100 : 0;
  const growthTrend = getTrendFromGrowth(s?.dauGrowthRate ?? null);
  const TrendIcon = s ? (TREND_ICON[s.dauTrendStatus] ?? Minus) : Minus;
  const ratioStatus = getRatioStatus(dauMauAnalyticsRatio);
  const dauComparison = lowData ? null : growthToComparison(s?.dauGrowthRate);
  const avgComparison = lowData || s?.previousPeriodDau == null || s.previousPeriodDau <= 0
    ? null
    : growthToComparison(
        ((s!.averageDau30Days - s!.previousPeriodDau) / s!.previousPeriodDau) * 100,
      );

  const shownInsights = data?.insights == null
    ? null
    : lowData
      ? data.insights.filter((i) => i.level === "warning" || i.level === "info")
      : data.insights;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Người dùng hoạt động (DAU / MAU)</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Theo dõi mức độ hoạt động và tần suất quay lại của người dùng.</p>
      </div>

      {/* 1. Overview KPIs */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 flex-1">
          <AnalyticsKpiCard
            title="DAU mới nhất"
            tooltip="Số người dùng hoạt động trong ngày cuối của kỳ đang xem."
            value={s?.dauToday}
            loading={loading}
            icon={UserCheck}
            iconColor="text-indigo-500"
            comparison={dauComparison}
          />
          <AnalyticsKpiCard
            title="MAU 30 ngày"
            tooltip="Số người dùng hoạt động duy nhất trong 30 ngày gần nhất."
            value={s?.mau30Days}
            loading={loading}
            icon={Users}
            iconColor="text-blue-500"
            comparison={{ label: "Chỉ số tích lũy 30 ngày", tone: "neutral" }}
          />
          <AnalyticsKpiCard
            title="TB DAU / ngày"
            tooltip="Trung bình số người dùng hoạt động mỗi ngày trong kỳ."
            value={s?.averageDau30Days}
            loading={loading}
            format={(v) => v.toFixed(1)}
            icon={BarChart3}
            iconColor="text-violet-500"
            comparison={avgComparison}
          />
          <AnalyticsKpiCard
            title="Xu hướng DAU"
            tooltip="Đánh giá thay đổi DAU so với kỳ trước theo ngưỡng tăng/giảm."
            value={lowData ? "—" : growthTrend.label}
            loading={loading}
            isText
            icon={lowData ? Minus : (s?.dauGrowthRate == null ? TrendIcon : growthTrend.icon)}
            iconColor={lowData ? "text-slate-600" : growthTrend.color}
            comparison={lowData ? null : growthTrend.comparison}
            sub={!lowData ? growthTrend.subtitle : undefined}
          />
        </div>
        {!loading && s && !lowData && (
          <div className="flex items-center justify-center lg:justify-end px-2">
            <RatioGauge ratio={dauMauAnalyticsRatio} />
          </div>
        )}
        {loading && <Skeleton className="w-full lg:w-28 h-28 rounded-full mx-auto lg:mx-0" />}
      </div>

      {!loading && !lowData && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge className={ratioStatus.badgeClass}>{ratioStatus.label}</Badge>
          <span className="text-muted-foreground">DAU/MAU (TB DAU / MAU) = TB DAU/ngày ÷ MAU 30 ngày</span>
        </div>
      )}

      {/* 2. Main chart */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-indigo-500 shrink-0" />
            <span className="text-sm font-semibold">Xu hướng DAU theo ngày</span>
            {s?.peakDauDay && !loading && (
              <span className="text-xs text-muted-foreground sm:ml-auto">
                Đỉnh: {new Date(s.peakDauDay).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })} ({fmt.format(s.peakDauCount)})
              </span>
            )}
          </div>
          <DauTrendChart
            chartData={data?.chartData ?? null}
            summary={s ?? null}
            loading={loading}
            onDayClick={openDayDetail}
          />
        </CardContent>
      </Card>

      <DauDayDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        selection={selectedDay}
        chartData={data?.chartData ?? null}
        summary={s ?? null}
      />

      {/* 3. Analysis & alerts */}
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Phân tích &amp; cảnh báo DAU</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ngưỡng: Tăng {">"} {GROWTH_STABLE_MAX}%, Giảm {"<"} {GROWTH_STABLE_MIN}%, còn lại là Ổn định.
          </p>
        </div>
        <AnalyticsInsightCards
          insights={shownInsights}
          loading={loading}
          limit={4}
          emptyMessage="DAU ổn định — không có cảnh báo trong kỳ này."
        />
      </div>
    </section>
  );
};

export default DauMauAnalyticsSection;

function getRatioStatus(ratio: number) {
  if (ratio >= DAU_MAU_GOOD) {
    return { label: "Tốt (>40%)", badgeClass: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" };
  }
  if (ratio >= DAU_MAU_WARNING) {
    return { label: "Cần chú ý (20%-40%)", badgeClass: "bg-amber-100 text-amber-700 hover:bg-amber-100" };
  }
  return { label: "Cảnh báo (<20%)", badgeClass: "bg-red-100 text-red-700 hover:bg-red-100" };
}

function getTrendFromGrowth(growthRate: number | null): {
  label: "Tăng mạnh" | "Tăng nhẹ" | "Ổn định" | "Giảm nhẹ" | "Giảm mạnh";
  subtitle: string;
  comparison: ReturnType<typeof growthToComparison>;
  icon: React.FC<{ className?: string }>;
  color: string;
} {
  const comparison = growthToComparison(growthRate);
  if (growthRate == null) {
    return { label: "Ổn định", subtitle: "Không có dữ liệu so sánh kỳ trước.", comparison, icon: ArrowRight, color: "text-slate-600" };
  }
  const value = Math.abs(growthRate).toFixed(1);
  if (growthRate > GROWTH_SOFT_MAX) {
    return { label: "Tăng mạnh", subtitle: `Tăng ${value}% so với kỳ trước.`, comparison, icon: ArrowUp, color: "text-emerald-600" };
  }
  if (growthRate > GROWTH_STABLE_MAX) {
    return { label: "Tăng nhẹ", subtitle: `Tăng ${value}% so với kỳ trước.`, comparison, icon: ArrowUp, color: "text-emerald-500" };
  }
  if (growthRate >= GROWTH_STABLE_MIN && growthRate <= GROWTH_STABLE_MAX) {
    if (growthRate >= 0) {
      return {
        label: "Ổn định",
        subtitle: `Tăng nhẹ ${value}%, vẫn nằm trong ngưỡng ổn định.`,
        comparison,
        icon: ArrowRight,
        color: "text-sky-600",
      };
    }
    return {
      label: "Ổn định",
      subtitle: `Giảm nhẹ ${value}%, vẫn nằm trong ngưỡng ổn định.`,
      comparison,
      icon: ArrowRight,
      color: "text-sky-600",
    };
  }
  if (growthRate >= GROWTH_STRONG_MIN) {
    return { label: "Giảm nhẹ", subtitle: `Giảm ${value}% so với kỳ trước.`, comparison, icon: ArrowDown, color: "text-orange-600" };
  }
  return { label: "Giảm mạnh", subtitle: `Giảm ${value}% so với kỳ trước.`, comparison, icon: ArrowDown, color: "text-red-600" };
}
