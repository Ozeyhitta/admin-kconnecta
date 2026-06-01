import * as React from "react";
import * as echarts from "echarts";
import { Skeleton } from "@/components/ui/skeleton";
import type { AnalyticsChartPoint, DauMauSummary } from "../types";

const fmt = new Intl.NumberFormat("vi-VN");

interface DauTrendChartProps {
  chartData: AnalyticsChartPoint[] | null;
  summary: DauMauSummary | null;
  loading?: boolean;
}

export const DauTrendChart = ({ chartData, summary, loading }: DauTrendChartProps) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const inst = React.useRef<echarts.ECharts | null>(null);

  const counts = React.useMemo(() => chartData?.map(d => d.count) ?? [], [chartData]);
  const avg = summary?.averageDau30Days ?? (counts.length > 0 ? counts.reduce((a, b) => a + b, 0) / counts.length : 0);
  const peakIdx = React.useMemo(() => {
    if (counts.length === 0) return -1;
    const max = Math.max(...counts);
    return max > 0 ? counts.indexOf(max) : -1;
  }, [counts]);

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
          const deltaHtml = delta === null ? "" :
            `<br/><span style="color:${delta > 0 ? "#10b981" : delta < 0 ? "#ef4444" : "#94a3b8"}">` +
            `${delta > 0 ? "▲" : delta < 0 ? "▼" : "—"} ${fmt.format(Math.abs(delta))} so với ngày trước</span>`;
          const peakHtml = idx === peakIdx && val > 0
            ? `<br/><span style="color:#f59e0b;font-weight:600">⭐ DAU cao nhất</span>` : "";
          const avgHtml = avg > 0
            ? `<br/><span style="color:#94a3b8">TB: ${avg.toFixed(1)} · ${val >= avg ? "trên" : "dưới"} trung bình</span>` : "";
          return `<b>${point.label}</b><br/>${fmt.format(val)} người dùng${deltaHtml}${peakHtml}${avgHtml}`;
        },
      },
      grid: { left: "1%", right: "2%", bottom: "3%", top: "10%", containLabel: true },
      xAxis: {
        type: "category",
        data: chartData.map(d => d.label),
        axisLabel: { rotate: chartData.length > 14 ? 40 : 30, fontSize: 10 },
        boundaryGap: false,
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        min: 0,
        splitLine: { lineStyle: { type: "dashed", color: "#e5e7eb" } },
      },
      series: [{
        type: "line",
        data: counts.map((c, i) => ({
          value: c,
          itemStyle: i === peakIdx
            ? { color: "#f59e0b", borderWidth: 3, borderColor: "#fff" }
            : { color: "#6366f1" },
          symbolSize: i === peakIdx ? 10 : 4,
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
          label: { formatter: `TB: ${avg.toFixed(1)}`, position: "end", fontSize: 10, color: "#94a3b8" },
          lineStyle: { color: "#94a3b8", type: "dashed", width: 1.5 },
        } : undefined,
      }],
    }, true);

    const onResize = () => inst.current?.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      inst.current?.dispose();
      inst.current = null;
    };
  }, [dataKey, chartData, counts, peakIdx, avg]);

  if (loading || chartData === null) return <Skeleton className="w-full h-[220px]" />;
  if (chartData.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-16">Chưa có dữ liệu DAU</p>;
  }
  return <div ref={ref} style={{ width: "100%", height: 220 }} />;
};

export default DauTrendChart;
