import * as React from "react";
import * as echarts from "echarts";
import { Skeleton } from "@/components/ui/skeleton";
import { getChartTheme } from "@/lib/chartColors";
import { CHART_PALETTE, formatTopicLabel } from "../constants";
import { fmt, formatDay } from "../utils";
import type { ChartData } from "../types";

export type DayChartSelection = {
  date: string;
  index: number;
};

type TopicLineChartProps = {
  data: ChartData["topicDaily"] | null;
  loading?: boolean;
  onDaySelect?: (selection: DayChartSelection) => void;
};

export function TopicLineChart({ data, loading, onDaySelect }: TopicLineChartProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inst = React.useRef<echarts.ECharts | null>(null);
  const onDaySelectRef = React.useRef(onDaySelect);
  const dataRef = React.useRef(data);
  const dataKey = data === null ? "" : JSON.stringify(data);

  React.useEffect(() => {
    onDaySelectRef.current = onDaySelect;
    dataRef.current = data;
  });

  React.useEffect(() => {
    if (!data || data.series.length === 0 || !ref.current) return;
    inst.current ??= echarts.init(ref.current);
    const theme = getChartTheme();

    inst.current.setOption({
      color: CHART_PALETTE,
      tooltip: {
        trigger: "axis",
        formatter: (params: { axisValue: string; seriesName: string; value: number; color: string }[]) => {
          if (!params?.length) return "";
          const lines = params
            .filter((p) => p.value > 0)
            .map(
              (p) =>
                `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:6px"></span>${p.seriesName}: <b>${fmt.format(p.value)}</b> điểm`,
            );
          return [
            `<strong>${params[0].axisValue}</strong>`,
            ...lines,
            `<span style="opacity:0.75">Bấm để xem chi tiết ngày</span>`,
          ].join("<br/>");
        },
      },
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
          fontSize: 11,
          color: theme.mutedText,
          padding: [8, 4, 0, 4],
        },
        axisTick: { alignWithLabel: true },
        triggerEvent: true,
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
        symbolSize: 12,
        showSymbol: true,
        data: s.data,
        emphasis: {
          focus: "series",
          scale: 1.35,
          itemStyle: { borderWidth: 2, borderColor: "#fff" },
        },
      })),
    }, true);

    const openDay = (index: number) => {
      const chartData = dataRef.current;
      const isoDate = chartData?.dates[index];
      if (!isoDate || !onDaySelectRef.current) return;
      onDaySelectRef.current({ date: isoDate, index });
    };

    const resolveDayIndex = (offsetX: number, offsetY: number) => {
      const chart = inst.current;
      const chartData = dataRef.current;
      if (!chart || !chartData) return null;

      const pointInPixel: [number, number] = [offsetX, offsetY];
      if (!chart.containPixel("grid", pointInPixel)) return null;

      const pointInGrid = chart.convertFromPixel({ seriesIndex: 0 }, pointInPixel);
      if (!pointInGrid || pointInGrid[0] == null) return null;

      const index = Math.round(pointInGrid[0]);
      if (index < 0 || index >= chartData.dates.length) return null;
      return index;
    };

    const handleSeriesClick = (params: { componentType?: string; dataIndex?: number }) => {
      if (params.componentType !== "series" || params.dataIndex == null) return;
      openDay(params.dataIndex);
    };

    const handleAxisClick = (params: { componentType?: string; dataIndex?: number }) => {
      if (params.componentType !== "xAxis" || params.dataIndex == null) return;
      openDay(params.dataIndex);
    };

    const handleGridClick = (event: { offsetX?: number; offsetY?: number }) => {
      if (event.offsetX == null || event.offsetY == null) return;
      const index = resolveDayIndex(event.offsetX, event.offsetY);
      if (index != null) openDay(index);
    };

    inst.current.on("click", handleSeriesClick);
    inst.current.on("click", "xAxis.category", handleAxisClick);
    inst.current.getZr().on("click", handleGridClick);
    if (ref.current) ref.current.style.cursor = onDaySelect ? "pointer" : "";

    const onResize = () => inst.current?.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      inst.current?.off("click", handleSeriesClick);
      inst.current?.off("click", handleAxisClick);
      inst.current?.getZr().off("click", handleGridClick);
      inst.current?.dispose();
      inst.current = null;
    };
  }, [dataKey, data, onDaySelect]);

  if (loading || data === null) return <Skeleton className="w-full h-[340px]" />;
  if (data.series.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-24">Chưa có dữ liệu theo ngày</p>;
  }
  return <div ref={ref} className="w-full" style={{ height: 340 }} />;
}
