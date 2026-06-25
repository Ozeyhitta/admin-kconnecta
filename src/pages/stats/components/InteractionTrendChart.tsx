import * as React from "react";
import * as echarts from "echarts";
import { Skeleton } from "@/components/ui/skeleton";
import type { AnalyticsChartPoint, InteractionSummary } from "../types";

const fmt = new Intl.NumberFormat("vi-VN");

interface InteractionTrendChartProps {
  chartData: AnalyticsChartPoint[] | null;
  summary: InteractionSummary | null;
  loading?: boolean;
  onDayClick?: (point: AnalyticsChartPoint) => void;
}

export const InteractionTrendChart = ({ chartData, summary, loading, onDayClick }: InteractionTrendChartProps) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const inst = React.useRef<echarts.ECharts | null>(null);

  const counts = React.useMemo(() => chartData?.map(d => d.count) ?? [], [chartData]);
  const peakIdx = React.useMemo(() => {
    if (counts.length === 0 || !summary?.peakInteractionDay) return -1;
    return chartData?.findIndex(d => d.date === summary.peakInteractionDay) ?? -1;
  }, [counts, chartData, summary?.peakInteractionDay]);

  const dataKey = chartData === null ? "" : JSON.stringify(chartData);

  React.useEffect(() => {
    if (!chartData || !ref.current) return;
    inst.current ??= echarts.init(ref.current);

    inst.current.setOption({
      tooltip: {
        trigger: "axis",
        formatter: (params: { dataIndex: number; value: number }[]) => {
          const idx = params[0].dataIndex;
          const val = params[0].value;
          const point = chartData[idx];
          const prev = idx > 0 ? counts[idx - 1] : null;
          const delta = prev !== null ? val - prev : null;
          const deltaHtml = delta === null ? "" :
            `<br/><span style="color:${delta > 0 ? "#10b981" : delta < 0 ? "#ef4444" : "#94a3b8"}">` +
            `${delta > 0 ? "▲" : delta < 0 ? "▼" : "—"} ${fmt.format(Math.abs(delta))} so với ngày trước</span>`;
          const peakHtml = idx === peakIdx && val > 0
            ? `<br/><span style="color:#f59e0b;font-weight:600">⭐ Cao nhất trong kỳ</span>` : "";
          return `<b>${point.label}</b><br/>${fmt.format(val)} tương tác${deltaHtml}${peakHtml}`;
        },
      },
      grid: { left: "1%", right: "2%", bottom: "3%", top: "6%", containLabel: true },
      xAxis: {
        type: "category",
        data: chartData.map(d => d.label),
        axisLabel: { rotate: chartData.length > 14 ? 40 : 30, fontSize: 10 },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        splitLine: { lineStyle: { type: "dashed", color: "#e5e7eb" } },
      },
      series: [{
        type: "bar",
        data: counts.map((c, i) => ({
          value: c,
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: i === peakIdx
              ? new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: "#f59e0b" },
                  { offset: 1, color: "#fcd34d" },
                ])
              : new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: "#f59e0b" },
                  { offset: 1, color: "#fde68a" },
                ]),
          },
        })),
        barMaxWidth: 32,
      }],
    }, true);

    const onClick = (params: { dataIndex: number }) => {
      const point = chartData[params.dataIndex];
      if (point && onDayClick) onDayClick(point);
    };
    inst.current.off("click");
    inst.current.on("click", onClick);

    const onResize = () => inst.current?.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      inst.current?.dispose();
      inst.current = null;
    };
  }, [dataKey, chartData, counts, peakIdx, onDayClick]);

  if (loading || chartData === null) return <Skeleton className="w-full h-[220px]" />;
  if (chartData.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-16">Chưa có dữ liệu tương tác</p>;
  }
  return (
    <div className="space-y-1">
      {onDayClick && (
        <p className="text-[10px] text-muted-foreground text-right">Nhấn cột để xem chi tiết</p>
      )}
      <div ref={ref} style={{ width: "100%", height: 220, cursor: onDayClick ? "pointer" : undefined }} />
    </div>
  );
};

export default InteractionTrendChart;
