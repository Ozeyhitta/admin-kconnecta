import * as React from "react";
import { Activity, TrendingUp, TrendingDown, Minus, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { InteractionTrendChart } from "./InteractionTrendChart";
import { InteractionBreakdown } from "./InteractionBreakdown";
import { InteractionDetailDialog } from "./InteractionDetailDialog";
import { AnalyticsInsightCards } from "./AnalyticsInsightCards";
import type { StatsDateRange } from "@/lib/statsDateRange";
import {
  INTERACTION_TYPE_TO_ACTION,
  type AnalyticsChartPoint,
  type InteractionAnalytics,
  type InteractionBreakdownItem,
  type InteractionChartSelection,
} from "../types";

const fmt = new Intl.NumberFormat("vi-VN");

interface InteractionAnalyticsProps {
  data: InteractionAnalytics | null;
  loading: boolean;
  dateRange: StatsDateRange;
  /** Mẫu nhỏ (MAU < ngưỡng): ẩn kết luận xu hướng để không diễn giải nhiễu. */
  lowData?: boolean;
}

export const InteractionAnalyticsSection = ({ data, loading, dateRange, lowData }: InteractionAnalyticsProps) => {
  const s = data?.summary;
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [selection, setSelection] = React.useState<InteractionChartSelection | null>(null);

  const openDayDetail = React.useCallback((point: AnalyticsChartPoint) => {
    setSelection({ kind: "day", date: point.date, label: point.label });
    setDetailOpen(true);
  }, []);

  const openTypeDetail = React.useCallback((item: InteractionBreakdownItem) => {
    const actionType = INTERACTION_TYPE_TO_ACTION[item.type] ?? item.type;
    setSelection({ kind: "type", type: item.type, actionType });
    setDetailOpen(true);
  }, []);
  // Mẫu nhỏ: chỉ giữ ghi chú cảnh báo/trung tính, bỏ các kết luận tăng (success) / giảm (danger).
  const shownInsights = data?.insights == null
    ? null
    : lowData
      ? data.insights.filter((i) => i.level === "warning" || i.level === "info")
      : data.insights;

  return (
    <section className="space-y-4">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Lượt tương tác &amp; Tăng trưởng
      </h2>

      {/* Summary mini cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniKpi title="Tổng tương tác" value={s?.totalInteractions} loading={loading} icon={Activity} color="text-amber-500" />
        <MiniKpi
          title="TB / ngày"
          value={s?.averageInteractionsPerDay}
          loading={loading}
          format={(v) => v.toFixed(2)}
          icon={Activity}
          color="text-orange-500"
        />
        <MiniKpi
          title="Đỉnh trong kỳ"
          value={s?.peakInteractionCount}
          loading={loading}
          icon={Zap}
          color="text-yellow-500"
          sub={s?.peakInteractionDay
            ? new Date(s.peakInteractionDay).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })
            : undefined}
        />
        <MiniKpi
          title="Xu hướng"
          value={lowData ? "—" : s?.interactionTrendStatus}
          loading={loading}
          isText
          icon={lowData ? Minus : trendIcon(s?.interactionTrendStatus)}
          color="text-slate-600"
          sub={!lowData && s?.interactionGrowthRate != null
            ? `${s.interactionGrowthRate >= 0 ? "+" : ""}${s.interactionGrowthRate.toFixed(1)}% vs kỳ trước`
            : undefined}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Lượt tương tác theo ngày
            </h3>
            <InteractionTrendChart
              chartData={data?.chartData ?? null}
              summary={s ?? null}
              loading={loading}
              onDayClick={openDayDetail}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Breakdown loại tương tác
            </h3>
            <InteractionBreakdown
              breakdown={data?.breakdown ?? []}
              summary={s ?? null}
              loading={loading}
              onTypeClick={openTypeDetail}
            />
          </CardContent>
        </Card>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Phân tích &amp; cảnh báo tương tác
        </p>
        <AnalyticsInsightCards
          insights={shownInsights}
          loading={loading}
          limit={4}
          emptyMessage="Tương tác ổn định — không có cảnh báo trong kỳ này."
        />
      </div>

      <InteractionDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        dateRange={dateRange}
        selection={selection}
      />
    </section>
  );
};

function trendIcon(status?: string) {
  if (!status) return Minus;
  if (status.includes("Tăng")) return TrendingUp;
  if (status.includes("Giảm")) return TrendingDown;
  return Minus;
}

interface MiniKpiProps {
  title: string;
  value?: number | string;
  loading?: boolean;
  icon: React.FC<{ className?: string }>;
  color: string;
  sub?: string;
  isText?: boolean;
  format?: (v: number) => string;
}

const MiniKpi = ({ title, value, loading, icon: Icon, color, sub, isText, format }: MiniKpiProps) => (
  <Card className="p-4">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{title}</p>
        {loading ? (
          <Skeleton className="h-7 w-16 mt-1" />
        ) : (
          <p className={`mt-1 font-bold tabular-nums ${isText ? "text-sm" : "text-xl"}`}>
            {value !== undefined
              ? typeof value === "number"
                ? format ? format(value) : fmt.format(value)
                : value
              : "—"}
          </p>
        )}
        {sub && !loading && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      <Icon className={`h-5 w-5 shrink-0 opacity-50 mt-0.5 ${color}`} />
    </div>
  </Card>
);

export default InteractionAnalyticsSection;
