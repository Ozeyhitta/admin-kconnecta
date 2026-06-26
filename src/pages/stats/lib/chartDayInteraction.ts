import type * as echarts from "echarts";
import type { AnalyticsChartPoint } from "../types";

type ChartDataGetter = () => AnalyticsChartPoint[];
type DayClickGetter = () => ((point: AnalyticsChartPoint) => void) | undefined;

function normalizeIndex(raw: unknown, chartData: AnalyticsChartPoint[]): number | null {
  if (typeof raw === "number" && !Number.isNaN(raw)) {
    const idx = Math.round(raw);
    if (idx >= 0 && idx < chartData.length) return idx;
  }
  if (typeof raw === "string") {
    const idx = chartData.findIndex((point) => point.label === raw);
    if (idx >= 0) return idx;
  }
  return null;
}

function resolveDataIndex(
  chart: echarts.ECharts,
  offsetX: number,
  offsetY: number,
  chartData: AnalyticsChartPoint[],
): number | null {
  const pixel: [number, number] = [offsetX, offsetY];

  // Bar charts: series hit-test is most reliable.
  if (chart.containPixel({ seriesIndex: 0 }, pixel)) {
    const result = chart.convertFromPixel({ seriesIndex: 0 }, pixel);
    const raw = Array.isArray(result) ? result[0] : result;
    const idx = normalizeIndex(raw, chartData);
    if (idx !== null) return idx;
  }

  if (chart.containPixel({ gridIndex: 0 }, pixel)) {
    const result = chart.convertFromPixel({ gridIndex: 0 }, pixel);
    const raw = Array.isArray(result) ? result[0] : result;
    const idx = normalizeIndex(raw, chartData);
    if (idx !== null) return idx;
  }

  if (chart.containPixel("grid", pixel)) {
    const result = chart.convertFromPixel({ xAxisIndex: 0 }, pixel);
    const raw = Array.isArray(result) ? result[0] : result;
    const idx = normalizeIndex(raw, chartData);
    if (idx !== null) return idx;
  }

  return null;
}

export function attachChartDayInteraction(
  chart: echarts.ECharts,
  getChartData: ChartDataGetter,
  getOnDayClick: DayClickGetter,
  onHoverIndex?: (index: number | null) => void,
): () => void {
  const openAtIndex = (idx: number) => {
    const onDayClick = getOnDayClick();
    if (!onDayClick) return;
    const chartData = getChartData();
    const point = chartData[idx];
    if (point) onDayClick(point);
  };

  const onZrClick = (e: { offsetX: number; offsetY: number }) => {
    if (!getOnDayClick()) return;
    const idx = resolveDataIndex(chart, e.offsetX, e.offsetY, getChartData());
    if (idx !== null) openAtIndex(idx);
  };

  const onZrMove = (e: { offsetX: number; offsetY: number }) => {
    const onDayClick = getOnDayClick();
    if (!onDayClick) {
      chart.getZr().setCursorStyle("default");
      return;
    }
    const idx = resolveDataIndex(chart, e.offsetX, e.offsetY, getChartData());
    chart.getZr().setCursorStyle(idx !== null ? "pointer" : "default");
    onHoverIndex?.(idx);
  };

  const onZrOut = () => {
    chart.getZr().setCursorStyle("default");
    onHoverIndex?.(null);
  };

  const onSeriesClick = (params: {
    componentType?: string;
    dataIndex?: number;
  }) => {
    if (!getOnDayClick()) return;
    if (params.componentType !== "series" || params.dataIndex == null) return;
    if (params.dataIndex >= 0) openAtIndex(params.dataIndex);
  };

  chart.getZr().on("click", onZrClick);
  chart.getZr().on("mousemove", onZrMove);
  chart.getZr().on("globalout", onZrOut);
  chart.on("click", onSeriesClick);

  return () => {
    chart.getZr().off("click", onZrClick);
    chart.getZr().off("mousemove", onZrMove);
    chart.getZr().off("globalout", onZrOut);
    chart.off("click", onSeriesClick);
    chart.getZr().setCursorStyle("default");
  };
}
