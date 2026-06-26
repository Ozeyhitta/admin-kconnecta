import * as React from "react";
import * as echarts from "echarts";
import { Skeleton } from "@/components/ui/skeleton";
import { attachChartDayInteraction } from "../lib/chartDayInteraction";
import type { AnalyticsChartPoint, DauMauSummary } from "../types";

const CLICK_HINT = "<br/><span style=\"color:#94a3b8;font-size:11px\">Nhấn để xem chi tiết theo ngày</span>";

const fmt = new Intl.NumberFormat("vi-VN");

interface DauTrendChartProps {
  chartData: AnalyticsChartPoint[] | null;
  summary: DauMauSummary | null;
  loading?: boolean;
  onDayClick?: (point: AnalyticsChartPoint) => void;
}

export const DauTrendChart = ({ chartData, summary, loading, onDayClick }: DauTrendChartProps) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const inst = React.useRef<echarts.ECharts | null>(null);

  const counts = React.useMemo(() => chartData?.map(d => d.count) ?? [], [chartData]);
  const avg = summary?.averageDau30Days ?? (counts.length > 0 ? counts.reduce((a, b) => a + b, 0) / counts.length : 0);
  const maxCount = React.useMemo(() => (counts.length > 0 ? Math.max(...counts) : 0), [counts]);
  const peakIdx = React.useMemo(() => {
    if (counts.length === 0) return -1;
    return maxCount > 0 ? counts.indexOf(maxCount) : -1;
  }, [counts, maxCount]);

  const dataKey = chartData === null ? "" : JSON.stringify(chartData);

  React.useEffect(() => {
    if (!chartData || !ref.current) return;
    inst.current ??= echarts.init(ref.current);

    inst.current.setOption({
      tooltip: {
        trigger: "axis",
        formatter: (params: { dataIndex: number; value: number; name: string }[]) => {
          const idx = params[0].dataIndex;
          const val = params[0].value;
          const point = chartData[idx];
          const prev = idx > 0 ? counts[idx - 1] : null;
          const delta = prev !== null ? val - prev : null;
          const avgDiffPercent = avg > 0 ? ((val - avg) / avg) * 100 : null;
          const avgHtml = avgDiffPercent === null
            ? `<br/><span style="color:#94a3b8">So với TB: không xác định</span>`
            : `<br/><span style="color:${avgDiffPercent >= 0 ? "#10b981" : "#ef4444"}">` +
            `So với TB: ${avgDiffPercent >= 0 ? "cao hơn" : "thấp hơn"} ${Math.abs(avgDiffPercent).toFixed(1)}%</span>`;
          const deltaHtml = delta === null
            ? `<br/><span style="color:#94a3b8">So với hôm trước: không có dữ liệu</span>`
            : `<br/><span style="color:${delta > 0 ? "#10b981" : delta < 0 ? "#ef4444" : "#94a3b8"}">` +
            `So với hôm trước: ${delta > 0 ? "tăng" : delta < 0 ? "giảm" : "không đổi"} ${fmt.format(Math.abs(delta))} người</span>`;
          const peakHtml = idx === peakIdx && val > 0
            ? `<br/><span style="color:#f59e0b;font-weight:600">⭐ DAU cao nhất</span>` : "";
          const clickHtml = onDayClick ? CLICK_HINT : "";
          return `<b>${point.label}</b><br/>DAU: ${fmt.format(val)} người${avgHtml}${deltaHtml}${peakHtml}${clickHtml}`;
        },
      },
      legend: {
        data: ["DAU", "Trung bình"],
        bottom: 0,
        itemWidth: 14,
        itemHeight: 8,
        textStyle: { fontSize: 11, color: "#64748b" },
      },
      grid: { left: "2%", right: "8%", bottom: "14%", top: "10%", containLabel: true },
      xAxis: {
        type: "category",
        data: chartData.map(d => d.label),
        axisLabel: {
          rotate: chartData.length > 20 ? 45 : chartData.length > 12 ? 30 : 0,
          fontSize: 10,
          hideOverlap: true,
          interval: "auto",
        },
        boundaryGap: false,
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        min: 0,
        max: (value: { max: number }) => {
          const sourceMax = Math.max(value.max, maxCount);
          if (sourceMax <= 0) return 5;
          return Math.ceil(sourceMax * 1.12);
        },
        splitLine: { lineStyle: { type: "dashed", color: "#e5e7eb" } },
      },
      series: [{
        name: "DAU",
        type: "line",
        triggerEvent: true,
        showSymbol: true,
        symbolSize: 10,
        emphasis: {
          focus: "series",
          scale: true,
          symbolSize: 16,
          itemStyle: { borderWidth: 2, borderColor: "#fff" },
        },
        data: counts.map((c, i) => ({
          value: c,
          itemStyle: i === peakIdx
            ? { color: "#f59e0b", borderWidth: 3, borderColor: "#fff" }
            : { color: "#6366f1" },
          symbolSize: i === peakIdx ? 12 : 10,
        })),
        smooth: true,
        lineStyle: { color: "#6366f1", width: 2.5 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(99,102,241,0.28)" },
            { offset: 1, color: "rgba(99,102,241,0)" },
          ]),
        },
        markLine: avg > 0 ? {
          silent: true,
          data: [{ yAxis: avg, name: "Trung bình" }],
          label: {
            formatter: `TB: ${avg.toFixed(1)}`,
            position: "insideEndTop",
            fontSize: 10,
            color: "#64748b",
            padding: [2, 6],
            backgroundColor: "rgba(255,255,255,0.9)",
          },
          lineStyle: { color: "#94a3b8", type: "dashed", width: 1.5 },
        } : undefined,
      }],
    }, true);

    const detachInteraction = attachChartDayInteraction(
      inst.current,
      () => chartData,
      () => onDayClick,
    );

    const onResize = () => inst.current?.resize();
    window.addEventListener("resize", onResize);
    return () => {
      detachInteraction();
      window.removeEventListener("resize", onResize);
      inst.current?.dispose();
      inst.current = null;
    };
  }, [dataKey, chartData, counts, peakIdx, avg, onDayClick]);

  if (loading || chartData === null) return <Skeleton className="w-full h-[240px] rounded-md" />;
  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed bg-muted/30 py-14 px-4">
        <p className="text-sm font-medium text-muted-foreground">Chưa có dữ liệu DAU</p>
        <p className="text-xs text-muted-foreground mt-1">Thử chọn khoảng thời gian khác hoặc đợi thêm dữ liệu.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {onDayClick && (
        <p className="text-xs text-muted-foreground text-right">Nhấn biểu đồ để xem chi tiết theo ngày</p>
      )}
      <div ref={ref} style={{ width: "100%", height: 240 }} />
    </div>
  );
};

export default DauTrendChart;
