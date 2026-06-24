import * as React from "react";
import * as echarts from "echarts";
import { Skeleton } from "@/components/ui/skeleton";
import { getChartTheme } from "@/lib/chartColors";
import { CHART_PALETTE, formatTopicLabel } from "../constants";
import { fmt } from "../utils";
import type { ChartData, TopicScorePoint } from "../types";

type TopicBarChartProps = {
  data: ChartData["topicBar"] | null;
  loading?: boolean;
  onTopicSelect?: (point: TopicScorePoint) => void;
};

export function TopicBarChart({ data, loading, onTopicSelect }: TopicBarChartProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inst = React.useRef<echarts.ECharts | null>(null);
  const dataKey = data === null ? "" : JSON.stringify(data);

  React.useEffect(() => {
    if (!data || data.length === 0 || !ref.current) return;
    inst.current ??= echarts.init(ref.current);
    const theme = getChartTheme();

    inst.current.setOption({
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (p: { name: string; value: number; dataIndex: number }[]) => {
          const idx = data.length - 1 - p[0].dataIndex;
          const row = data[idx];
          return `${formatTopicLabel(row?.topic ?? p[0].name.replace(/^#/, ""), row?.source)}<br/><b>${fmt.format(p[0].value)}</b> điểm<br/>${fmt.format(row?.postCount ?? 0)} bài<br/><span style="opacity:0.75">Bấm để xem danh sách bài</span>`;
        },
      },
      grid: { left: "1%", right: "8%", bottom: "3%", top: "6%", containLabel: true },
      xAxis: {
        type: "value",
        splitLine: { lineStyle: { type: "dashed", color: theme.gridLineColor } },
        axisLabel: { color: theme.mutedText },
      },
      yAxis: {
        type: "category",
        data: [...data].reverse().map((d) => formatTopicLabel(d.topic, d.source)),
        axisLabel: { fontSize: 11, color: theme.mutedText },
      },
      series: [{
        type: "bar",
        data: [...data].reverse().map((d, i) => ({
          value: d.score,
          itemStyle: { color: CHART_PALETTE[(data.length - 1 - i) % CHART_PALETTE.length] },
        })),
        barMaxWidth: 22,
        itemStyle: { borderRadius: [0, 4, 4, 0] },
        label: {
          show: true,
          position: "right",
          fontSize: 10,
          color: theme.mutedText,
          formatter: (p: { value: number }) => fmt.format(p.value),
        },
      }],
    }, true);

    const handleClick = (params: { componentType?: string; dataIndex?: number }) => {
      if (!onTopicSelect || params.componentType !== "series" || params.dataIndex == null) return;
      const idx = data.length - 1 - params.dataIndex;
      const row = data[idx];
      if (row) onTopicSelect(row);
    };
    inst.current.on("click", handleClick);
    if (ref.current) ref.current.style.cursor = onTopicSelect ? "pointer" : "";

    const onResize = () => inst.current?.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      inst.current?.off("click", handleClick);
      inst.current?.dispose();
      inst.current = null;
    };
  }, [dataKey, data, onTopicSelect]);

  if (loading || data === null) return <Skeleton className="w-full h-[340px]" />;
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-24">Chưa có hashtag trong kỳ</p>;
  }
  return <div ref={ref} className="w-full" style={{ height: 340 }} />;
}
