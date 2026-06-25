import * as React from "react";
import { Link } from "react-router";
import { ExternalLink, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/services/axiosInstance";
import { toStatsApiParams, type StatsDateRange } from "@/lib/statsDateRange";
import { BREAKDOWN_COLORS, type InteractionChartSelection, type InteractionDetailResponse } from "../types";
import * as echarts from "echarts";

const fmt = new Intl.NumberFormat("vi-VN");
const timeFmt = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" });

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateRange: StatsDateRange;
  selection: InteractionChartSelection | null;
};

export function InteractionDetailDialog({ open, onOpenChange, dateRange, selection }: Props) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<InteractionDetailResponse | null>(null);
  const chartRef = React.useRef<HTMLDivElement>(null);
  const chartInst = React.useRef<echarts.ECharts | null>(null);

  React.useEffect(() => {
    if (!open || !selection) {
      setData(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const params: Record<string, string> = { ...toStatsApiParams(dateRange) };
    if (selection.kind === "day") {
      params.date = selection.date;
    } else {
      params.actionType = selection.actionType;
    }

    void apiClient
      .get<InteractionDetailResponse>("/api/v1/admin/stats/interaction-detail", { params })
      .then((r) => {
        if (!cancelled) setData(r.data);
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          setError("Không tải được chi tiết tương tác.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, dateRange, selection]);

  React.useEffect(() => {
    if (!open || !data || data.mode !== "type" || !chartRef.current || data.chartData.length === 0) {
      chartInst.current?.dispose();
      chartInst.current = null;
      return;
    }

    chartInst.current ??= echarts.init(chartRef.current);
    chartInst.current.setOption({
      tooltip: { trigger: "axis" },
      grid: { left: "2%", right: "2%", bottom: "4%", top: "8%", containLabel: true },
      xAxis: {
        type: "category",
        data: data.chartData.map((d) => d.label),
        axisLabel: { rotate: data.chartData.length > 12 ? 35 : 0, fontSize: 10 },
      },
      yAxis: { type: "value", minInterval: 1 },
      series: [{
        type: "bar",
        data: data.chartData.map((d) => d.count),
        itemStyle: { borderRadius: [4, 4, 0, 0], color: "#f59e0b" },
        barMaxWidth: 28,
      }],
    }, true);

    const onResize = () => chartInst.current?.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chartInst.current?.dispose();
      chartInst.current = null;
    };
  }, [open, data]);

  const title = selection
    ? selection.kind === "day"
      ? `Ngày ${selection.label}`
      : selection.type
    : "Chi tiết";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
          <DialogTitle>{data?.title ?? title}</DialogTitle>
          <DialogDescription>
            {selection?.kind === "day"
              ? "Phân bổ loại tương tác và hoạt động gần nhất trong ngày."
              : "Biểu đồ theo ngày và hoạt động gần nhất của loại tương tác."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Đang tải chi tiết…
            </div>
          ) : error ? (
            <p className="text-sm text-destructive text-center py-12">{error}</p>
          ) : data ? (
            <>
              <div className="rounded-lg border bg-muted/30 px-4 py-3">
                <p className="text-xs text-muted-foreground">Tổng trong mục đã chọn</p>
                <p className="text-2xl font-bold tabular-nums">{fmt.format(data.totalCount)}</p>
              </div>

              {data.mode === "day" && data.breakdown.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Phân bổ theo loại
                  </p>
                  {data.breakdown.map((item) => (
                    <div key={item.type} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{item.type}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {fmt.format(item.count)} ({item.percentage}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${item.percentage}%`,
                            backgroundColor: BREAKDOWN_COLORS[item.type] ?? "#94a3b8",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {data.mode === "type" && data.chartData.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Theo ngày trong kỳ
                  </p>
                  <div ref={chartRef} style={{ width: "100%", height: 200 }} />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Hoạt động gần đây
                  </p>
                  <Link
                    to="/activity-logs"
                    className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
                    onClick={() => onOpenChange(false)}
                  >
                    Xem tất cả
                    <ExternalLink className="size-3" />
                  </Link>
                </div>
                {data.recentLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">Không có log trong mục này.</p>
                ) : (
                  <ul className="divide-y rounded-lg border">
                    {data.recentLogs.map((log) => (
                      <li key={log.id} className="flex items-start gap-3 px-3 py-2.5">
                        <Avatar className="size-8 shrink-0">
                          <AvatarImage src={log.avatarUrl ?? undefined} />
                          <AvatarFallback className="text-xs">
                            {(log.fullName ?? log.username ?? "?").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium truncate">
                              {log.fullName ?? log.username ?? "Người dùng"}
                            </span>
                            {log.actionLabel && (
                              <Badge variant="secondary" className="text-[10px] font-normal">
                                {log.actionLabel}
                              </Badge>
                            )}
                          </div>
                          {log.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{log.description}</p>
                          )}
                          {log.createdAt && (
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {timeFmt.format(new Date(log.createdAt))}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
