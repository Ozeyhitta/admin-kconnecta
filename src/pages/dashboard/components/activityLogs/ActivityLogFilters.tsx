import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ACTION_TYPE_OPTIONS, TIME_PRESETS, presetToDates } from "./activityLogConstants";
import type { ActivityLogFilters } from "./types";

interface Props {
  filters: ActivityLogFilters;
  onChange: (next: ActivityLogFilters) => void;
  compact?: boolean;
}

const today = new Date().toISOString().slice(0, 10);

export const ActivityLogFilterBar = ({ filters, onChange, compact }: Props) => {
  const set = (patch: Partial<ActivityLogFilters>) => onChange({ ...filters, ...patch });

  const handlePreset = (preset: string) => {
    const dates = presetToDates(preset);
    set({ timePreset: preset, ...(dates ?? {}) });
  };

  return (
    <div className={`space-y-3 ${compact ? "mb-3" : "mb-4"}`}>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tìm theo tên, username hoặc nội dung hoạt động..."
          className="pl-8 h-9"
          value={filters.username ?? ""}
          onChange={e => set({ username: e.target.value || undefined })}
        />
      </div>

      {/* Time preset */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground shrink-0 mr-1">Thời gian:</span>
        {TIME_PRESETS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handlePreset(opt.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
              filters.timePreset === opt.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Custom date inputs */}
      {filters.timePreset === "custom" && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Từ ngày</label>
            <Input
              type="date"
              className="h-8 min-w-[130px] flex-1"
              value={filters.from ?? ""}
              max={filters.to || today}
              onChange={e => set({ from: e.target.value || undefined })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Đến ngày</label>
            <Input
              type="date"
              className="h-8 min-w-[130px] flex-1"
              value={filters.to ?? ""}
              min={filters.from}
              max={today}
              onChange={e => set({ to: e.target.value || undefined })}
            />
          </div>
        </div>
      )}

      {/* Select filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Loại hoạt động</span>
          <Select
            value={filters.actionType ?? "all"}
            onValueChange={v => set({ actionType: v === "all" ? undefined : v })}
          >
            <SelectTrigger className="min-w-[150px] h-9">
              <SelectValue placeholder="Tất cả loại" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả loại</SelectItem>
              {ACTION_TYPE_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Trạng thái</span>
          <Select
            value={filters.status ?? "all"}
            onValueChange={v => set({ status: v === "all" ? undefined : v })}
          >
            <SelectTrigger className="min-w-[130px] h-9">
              <SelectValue placeholder="Mọi trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Mọi trạng thái</SelectItem>
              <SelectItem value="SUCCESS">Thành công</SelectItem>
              <SelectItem value="FAILED">Thất bại</SelectItem>
              <SelectItem value="PENDING">Đang xử lý</SelectItem>
              <SelectItem value="BLOCKED">Bị chặn</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Mức độ</span>
          <Select
            value={filters.severity ?? "all"}
            onValueChange={v => set({ severity: v === "all" ? undefined : v })}
          >
            <SelectTrigger className="min-w-[120px] h-9">
              <SelectValue placeholder="Mọi mức độ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Mọi mức độ</SelectItem>
              <SelectItem value="INFO">Thông tin</SelectItem>
              <SelectItem value="WARNING">Cảnh báo</SelectItem>
              <SelectItem value="ERROR">Lỗi</SelectItem>
              <SelectItem value="CRITICAL">Nghiêm trọng</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 h-9 px-2 rounded-md border bg-muted/40 self-end">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <Label htmlFor="abnormal-only" className="text-xs cursor-pointer whitespace-nowrap">
            Chỉ bất thường
          </Label>
          <Switch
            id="abnormal-only"
            checked={!!filters.abnormalOnly}
            onCheckedChange={v => set({ abnormalOnly: v || undefined })}
          />
        </div>
      </div>
    </div>
  );
};

export default ActivityLogFilterBar;
