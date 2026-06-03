import { CalendarDays } from "lucide-react";
import {
  type StatsCompareMode,
  type StatsDateRange,
  type StatsRangePreset,
  describeCompareLabel,
  describeStatsRange,
  formatDateInput,
  getComparisonRange,
  getPresetRange,
} from "@/lib/statsDateRange";

const QUICK_PRESETS: { value: StatsRangePreset; label: string }[] = [
  { value: "today",     label: "Hôm nay" },
  { value: "last7",     label: "7 ngày" },
  { value: "last30",    label: "30 ngày" },
  { value: "thisMonth", label: "Tháng này" },
  { value: "custom",    label: "Tuỳ chỉnh" },
];

const COMPARE_OPTIONS: { value: StatsCompareMode; label: string }[] = [
  { value: "none",            label: "Không so sánh" },
  { value: "previous_period", label: "Kỳ trước" },
  { value: "previous_month",  label: "Cùng kỳ tháng trước" },
];

interface StatsDateFilterProps {
  value: StatsDateRange;
  onChange: (value: StatsDateRange) => void;
}

export const StatsDateFilter = ({ value, onChange }: StatsDateFilterProps) => {
  const handlePresetClick = (preset: StatsRangePreset) => {
    if (preset === "custom") {
      onChange({ ...value, preset });
      return;
    }
    onChange({ ...value, preset, ...getPresetRange(preset as Exclude<StatsRangePreset, "custom" | "specificDate">) });
  };

  const today         = formatDateInput(new Date());
  const currentLabel  = describeStatsRange(value);
  const compareRange  = getComparisonRange(value);
  const compareLabel  = describeCompareLabel(value.compareMode);

  return (
    <div className="mb-4 rounded-lg border bg-card p-3 space-y-3">
      {/* Preset buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
        {QUICK_PRESETS.map(opt => (
          <button
            key={opt.value}
            onClick={() => handlePresetClick(opt.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
              value.preset === opt.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Custom date range */}
      {value.preset === "custom" && (
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Từ ngày</label>
            <input
              type="date"
              value={value.from}
              max={value.to || today}
              onChange={e => onChange({ ...value, from: e.target.value })}
              className="h-8 rounded-md border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Đến ngày</label>
            <input
              type="date"
              value={value.to}
              min={value.from}
              max={today}
              onChange={e => onChange({ ...value, to: e.target.value })}
              className="h-8 rounded-md border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      )}

      {/* Compare row */}
      <div className="flex items-center gap-2 pt-0.5">
        <span className="text-xs text-muted-foreground shrink-0">So sánh:</span>
        {COMPARE_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange({ ...value, compareMode: opt.value })}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors cursor-pointer ${
              value.compareMode === opt.value
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Active range info */}
      <div className="border-t pt-2 space-y-0.5">
        <p className="text-xs text-muted-foreground">
          Dữ liệu đang hiển thị cho khoảng:{" "}
          <span className="font-medium text-foreground">{currentLabel}</span>
        </p>
        {compareRange && compareLabel && (
          <p className="text-xs text-muted-foreground">
            So sánh với {compareLabel}:{" "}
            <span className="font-medium text-foreground">
              {describeStatsRange({ ...value, from: compareRange.from, to: compareRange.to })}
            </span>
          </p>
        )}
      </div>
    </div>
  );
};
