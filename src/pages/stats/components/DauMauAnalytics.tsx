import * as React from "react";
import { UserCheck, Users, TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DauTrendChart } from "./DauTrendChart";
import { AnalyticsInsightCards } from "./AnalyticsInsightCards";
import { RatioGauge } from "./RatioGauge";
import type { DauMauAnalytics } from "../types";

const fmt = new Intl.NumberFormat("vi-VN");

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
}

export const DauMauAnalyticsSection = ({ data, loading }: DauMauAnalyticsProps) => {
  const s = data?.summary;
  const TrendIcon = s ? (TREND_ICON[s.dauTrendStatus] ?? Minus) : Minus;

  return (
    <section className="space-y-4">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Người dùng hoạt động (DAU / MAU)
      </h2>

      {/* KPI row */}
      <div className="flex flex-wrap gap-4 items-start">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1">
          <MiniKpi title="DAU hôm nay" value={s?.dauToday} loading={loading} icon={UserCheck} color="text-indigo-500" />
          <MiniKpi title="MAU 30 ngày" value={s?.mau30Days} loading={loading} icon={Users} color="text-blue-500" />
          <MiniKpi
            title="TB DAU / ngày"
            value={s?.averageDau30Days}
            loading={loading}
            format={(v) => v.toFixed(1)}
            icon={BarChart3}
            color="text-violet-500"
          />
          <MiniKpi
            title="Xu hướng"
            value={s?.dauTrendStatus}
            loading={loading}
            isText
            icon={TrendIcon}
            color="text-slate-600"
            sub={s?.dauGrowthRate != null ? `${s.dauGrowthRate >= 0 ? "+" : ""}${s.dauGrowthRate.toFixed(1)}% vs kỳ trước` : undefined}
          />
        </div>
        {!loading && s && (
          <div className="flex items-center justify-center px-4">
            <RatioGauge ratio={s.dauMauRatio} />
          </div>
        )}
        {loading && <Skeleton className="w-28 h-28 rounded-full" />}
      </div>

      {/* Chart */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-indigo-500" />
            <span className="text-sm font-medium">Xu hướng DAU theo ngày</span>
            {s?.peakDauDay && !loading && (
              <span className="text-xs text-muted-foreground ml-auto">
                Đỉnh: {new Date(s.peakDauDay).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })} ({fmt.format(s.peakDauCount)})
              </span>
            )}
          </div>
          <DauTrendChart chartData={data?.chartData ?? null} summary={s ?? null} loading={loading} />
        </CardContent>
      </Card>

      {/* Insights */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Phân tích &amp; cảnh báo DAU
        </p>
        <AnalyticsInsightCards
          insights={data?.insights ?? null}
          loading={loading}
          limit={4}
          emptyMessage="DAU ổn định — không có cảnh báo trong kỳ này."
        />
      </div>
    </section>
  );
};

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

export default DauMauAnalyticsSection;
