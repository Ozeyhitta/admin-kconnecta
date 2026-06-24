import * as React from "react";
import * as echarts from "echarts";
import { Skeleton } from "@/components/ui/skeleton";
import { getChartTheme } from "@/lib/chartColors";
import { CHART_PALETTE, formatTopicLabel } from "../constants";
import { formatDay } from "../utils";
import type { ChartData } from "../types";

type TopicLineChartProps = {
  data: ChartData["topicDaily"] | null;
  loading?: boolean;
};

export function TopicLineChart({ data, loading }: TopicLineChartProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inst = React.useRef<echarts.ECharts | null>(null);
  const dataKey = data === null ? "" : JSON.stringify(data);

  React.useEffect(() => {
    if (!data || data.series.length === 0 || !ref.current) return;
    inst.current ??= echarts.init(ref.current);
    const theme = getChartTheme();

    inst.current.setOption({
      color: CHART_PALETTE,
      tooltip: { trigger: "axis" },
      legend: {
        data: data.series.map((s) => formatTopicLabel(s.topic, s.source)),
        bottom: 0,
        type: "scroll",
        textStyle: { fontSize: 11, color: theme.mutedText },
      },
      grid: { left: "1%", right: "2%", bottom: "14%", top: "6%", containLabel: true },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: data.dates.map(formatDay),
        axisLabel: {
          rotate: data.dates.length > 14 ? 40 : 0,
          fontSize: 10,
          color: theme.mutedText,
        },
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { type: "dashed", color: theme.gridLineColor } },
        axisLabel: { color: theme.mutedText },
      },
      series: data.series.map((s) => ({
        name: formatTopicLabel(s.topic, s.source),
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 4,
        data: s.data,
      })),
    }, true);

    const onResize = () => inst.current?.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      inst.current?.dispose();
      inst.current = null;
    };
  }, [dataKey, data]);

  if (loading || data === null) return <Skeleton className="w-full h-[340px]" />;
  if (data.series.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-24">Chưa có dữ liệu theo ngày</p>;
  }
  return <div ref={ref} className="w-full" style={{ height: 340 }} />;
}
