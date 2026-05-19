import * as React from "react";
import * as echarts from "echarts";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/services/axiosInstance";
import { ADMIN_CHARTS_POLL_MS, useIntervalPoll } from "@/lib/adminStatsPoll";

type Period = "day" | "week" | "month";

interface DataPoint {
  period: string;
  count: number;
}

const PERIOD_LABELS: Record<Period, string> = {
  day:   "30 ngày qua",
  week:  "12 tuần qua",
  month: "12 tháng qua",
};

const formatPeriodLabel = (raw: string, period: Period): string => {
  const d = new Date(raw);
  if (period === "day")   return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  if (period === "week")  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  return d.toLocaleDateString("vi-VN", { month: "short", year: "numeric" });
};

const UserGrowthChart = () => {
  const chartRef = React.useRef<HTMLDivElement>(null);
  const chartInst = React.useRef<echarts.ECharts | null>(null);

  const [period, setPeriod] = React.useState<Period>("day");
  const [data, setData] = React.useState<DataPoint[] | null>(null);

  const fetchData = React.useCallback(async () => {
    try {
      const r = await apiClient.get<DataPoint[]>("/api/v1/admin/stats/new-users", { params: { period } });
      setData(r.data);
    } catch {
      setData([]);
    }
  }, [period]);

  React.useEffect(() => {
    setData(null);
  }, [period]);

  useIntervalPoll(fetchData, ADMIN_CHARTS_POLL_MS, [fetchData]);

  React.useEffect(() => {
    if (!data || !chartRef.current) return;

    chartInst.current ??= echarts.init(chartRef.current);

    const labels = data.map(d => formatPeriodLabel(d.period, period));
    const counts = data.map(d => d.count);
    const maxVal = Math.max(...counts, 1);

    chartInst.current.setOption({
      tooltip: {
        trigger: "axis",
        formatter: (params: { name: string; value: number }[]) =>
          `${params[0].name}: <b>${params[0].value}</b> người dùng mới`,
      },
      grid: { left: "2%", right: "2%", bottom: "3%", top: "6%", containLabel: true },
      xAxis: {
        type: "category",
        data: labels,
        axisLabel: { rotate: period === "month" ? 0 : 30, fontSize: 10 },
        boundaryGap: false,
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        max: maxVal + Math.ceil(maxVal * 0.15),
        splitLine: { lineStyle: { type: "dashed", color: "#e5e7eb" } },
      },
      series: [{
        type: "line",
        data: counts,
        smooth: true,
        symbol: "circle",
        symbolSize: 5,
        lineStyle: { color: "#10b981", width: 2.5 },
        itemStyle: { color: "#10b981" },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(16,185,129,0.28)" },
            { offset: 1, color: "rgba(16,185,129,0)" },
          ]),
        },
      }],
    }, true);

    const onResize = () => chartInst.current?.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chartInst.current?.dispose();
      chartInst.current = null;
    };
  }, [data, period]);

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Người dùng mới đăng ký — {PERIOD_LABELS[period]}
          </h3>
          <div className="flex gap-1">
            {(["day", "week", "month"] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  period === p
                    ? "bg-emerald-500 text-white"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {p === "day" ? "Ngày" : p === "week" ? "Tuần" : "Tháng"}
              </button>
            ))}
          </div>
        </div>

        {data === null ? (
          <Skeleton className="w-full h-[200px]" />
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-16 text-center">Chưa có dữ liệu</p>
        ) : (
          <div ref={chartRef} style={{ width: "100%", height: 200 }} />
        )}
      </CardContent>
    </Card>
  );
};

export default UserGrowthChart;
