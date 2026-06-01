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
import { ACTION_TYPE_OPTIONS } from "./activityLogConstants";
import type { ActivityLogFilters } from "./types";

interface Props {
  filters: ActivityLogFilters;
  onChange: (next: ActivityLogFilters) => void;
  compact?: boolean;
}

export const ActivityLogFilterBar = ({ filters, onChange, compact }: Props) => {
  const set = (patch: Partial<ActivityLogFilters>) => onChange({ ...filters, ...patch });

  return (
    <div className={`flex flex-wrap items-end gap-3 ${compact ? "mb-3" : "mb-4"}`}>
      <div className="relative min-w-[160px] flex-1 max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tìm theo username..."
          className="pl-8 h-9"
          value={filters.username ?? ""}
          onChange={e => set({ username: e.target.value || undefined })}
        />
      </div>

      <Select value={filters.actionType ?? "all"} onValueChange={v => set({ actionType: v === "all" ? undefined : v })}>
        <SelectTrigger className="w-[160px] h-9">
          <SelectValue placeholder="Loại hoạt động" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả loại</SelectItem>
          {ACTION_TYPE_OPTIONS.map(o => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.status ?? "all"} onValueChange={v => set({ status: v === "all" ? undefined : v })}>
        <SelectTrigger className="w-[130px] h-9">
          <SelectValue placeholder="Trạng thái" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Mọi TT</SelectItem>
          <SelectItem value="SUCCESS">Thành công</SelectItem>
          <SelectItem value="FAILED">Thất bại</SelectItem>
          <SelectItem value="BLOCKED">Bị chặn</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.severity ?? "all"} onValueChange={v => set({ severity: v === "all" ? undefined : v })}>
        <SelectTrigger className="w-[130px] h-9">
          <SelectValue placeholder="Mức độ" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Mọi mức</SelectItem>
          <SelectItem value="INFO">Thông tin</SelectItem>
          <SelectItem value="WARNING">Cảnh báo</SelectItem>
          <SelectItem value="HIGH">Nghiêm trọng</SelectItem>
        </SelectContent>
      </Select>

      {!compact && (
        <>
          <Input type="date" className="w-[140px] h-9" value={filters.from ?? ""} onChange={e => set({ from: e.target.value || undefined })} />
          <Input type="date" className="w-[140px] h-9" value={filters.to ?? ""} onChange={e => set({ to: e.target.value || undefined })} />
        </>
      )}

      <div className="flex items-center gap-2 h-9 px-2 rounded-md border bg-muted/40">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <Label htmlFor="abnormal-only" className="text-xs cursor-pointer whitespace-nowrap">Chỉ bất thường</Label>
        <Switch
          id="abnormal-only"
          checked={!!filters.abnormalOnly}
          onCheckedChange={v => set({ abnormalOnly: v || undefined })}
        />
      </div>
    </div>
  );
};

export default ActivityLogFilterBar;
