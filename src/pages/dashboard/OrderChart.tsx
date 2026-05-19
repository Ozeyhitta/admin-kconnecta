import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import * as echarts from "echarts";
import { apiClient } from "@/services/axiosInstance";
import { ADMIN_CHARTS_POLL_MS, useIntervalPoll } from "@/lib/adminStatsPoll";

interface HourData { hour: number; count: number }
interface DayData  { day: string;  count: number }

const ActivityChart = () => {
  const hourRef = React.useRef<HTMLDivElement>(null);
  const dayRef  = React.useRef<HTMLDivElement>(null);
  const hourChart = React.useRef<echarts.ECharts | null>(null);
  const dayChart  = React.useRef<echarts.ECharts | null>(null);

  const [hourData, setHourData] = React.useState<HourData[] | null>(null);
  const [dayData,  setDayData]  = React.useState<DayData[]  | null>(null);

  const fetchCharts = React.useCallback(async () => {
    const [hourRes, dayRes] = await Promise.allSettled([
      apiClient.get<HourData[]>("/api/v1/admin/stats/activity-by-hour"),
      apiClient.get<DayData[]>("/api/v1/admin/stats/activity-by-day"),
    ]);
    setHourData(hourRes.status === "fulfilled" ? hourRes.value.data : []);
    setDayData(dayRes.status === "fulfilled" ? dayRes.value.data : []);
  }, []);

  useIntervalPoll(fetchCharts, ADMIN_CHARTS_POLL_MS, [fetchCharts]);

  // ── Chart by hour ───────────────────────────────────────────────
  React.useEffect(() => {
    if (!hourData || !hourRef.current) return;

    hourChart.current ??= echarts.init(hourRef.current);

    // Fill all 24 hours (missing hours → 0)
    const counts = Array.from({ length: 24 }, (_, h) =>
      hourData.find(d => d.hour === h)?.count ?? 0
    );

    hourChart.current.setOption({
      tooltip: { trigger: "axis", formatter: (p: { dataIndex: number; value: number }[]) =>
        `${p[0].dataIndex}h: ${p[0].value} hoạt động` },
      grid: { left: "2%", right: "2%", bottom: "3%", top: "4%", containLabel: true },
      xAxis: {
        type: "category",
        data: Array.from({ length: 24 }, (_, h) => `${h}h`),
        axisLabel: { interval: 1 },
      },
      yAxis: { type: "value", splitLine: { lineStyle: { type: "dashed", color: "#ccc" } } },
      series: [{
        type: "bar",
        data: counts,
        barMaxWidth: 28,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0,   color: "#6366f1" },
            { offset: 1,   color: "#a5b4fc" },
          ]),
          borderRadius: [4, 4, 0, 0],
        },
      }],
    });

    const onResize = () => hourChart.current?.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      hourChart.current?.dispose();
      hourChart.current = null;
    };
  }, [hourData]);

  // ── Chart by day ────────────────────────────────────────────────
  React.useEffect(() => {
    if (!dayData || !dayRef.current) return;

    dayChart.current ??= echarts.init(dayRef.current);

    dayChart.current.setOption({
      tooltip: { trigger: "axis" },
      grid: { left: "2%", right: "2%", bottom: "3%", top: "4%", containLabel: true },
      xAxis: {
        type: "category",
        data: dayData.map(d => d.day),
        axisLabel: { rotate: 30, fontSize: 10 },
        boundaryGap: false,
      },
      yAxis: { type: "value", splitLine: { lineStyle: { type: "dashed", color: "#ccc" } } },
      series: [{
        type: "line",
        data: dayData.map(d => d.count),
        smooth: true,
        symbol: "none",
        lineStyle: { color: "#8b5cf6", width: 2 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0,   color: "rgba(139,92,246,0.35)" },
            { offset: 1,   color: "rgba(139,92,246,0)" },
          ]),
        },
      }],
    });

    const onResize = () => dayChart.current?.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      dayChart.current?.dispose();
      dayChart.current = null;
    };
  }, [dayData]);

  return (
    <Card>
      <CardContent className="flex flex-col gap-6 pt-4">
        {/* By hour */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Hoạt động theo giờ trong ngày (30 ngày qua)
          </h3>
          {hourData === null
            ? <Skeleton className="w-full h-[220px]" />
            : <div ref={hourRef} style={{ width: "100%", height: 220 }} />
          }
        </div>

        {/* By day */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Xu hướng hoạt động 30 ngày qua
          </h3>
          {dayData === null
            ? <Skeleton className="w-full h-[180px]" />
            : <div ref={dayRef} style={{ width: "100%", height: 180 }} />
          }
        </div>
      </CardContent>
    </Card>
  );
};

export default ActivityChart;
