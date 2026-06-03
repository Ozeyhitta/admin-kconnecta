import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { STATUS_LABELS, SEVERITY_LABELS, timeOnlyFormatter, timeFormatter } from "./activityLogConstants";
import type { ActivityLogItem } from "./types";

interface Props {
  item: ActivityLogItem;
  onClick?: (item: ActivityLogItem) => void;
}

export const ActivityLogItemRow = ({ item, onClick }: Props) => {
  const statusCfg   = STATUS_LABELS[item.status]   ?? STATUS_LABELS.SUCCESS;
  const severityCfg = SEVERITY_LABELS[item.severity] ?? SEVERITY_LABELS.INFO;

  const displayName = item.fullName ?? item.username ?? "Không rõ";
  const userLine    = item.username
    ? `${displayName} (@${item.username})`
    : displayName;
  const initials    = displayName.slice(0, 2).toUpperCase();

  const createdDate = item.createdAt ? new Date(item.createdAt) : null;
  const timeOnly    = createdDate ? timeOnlyFormatter.format(createdDate) : "—";
  const fullDate    = createdDate ? timeFormatter.format(createdDate) : "—";

  return (
    <button
      type="button"
      onClick={() => onClick?.(item)}
      className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b last:border-b-0"
    >
      {/* Avatar */}
      <Avatar className="h-9 w-9 shrink-0 mt-0.5">
        {item.avatarUrl && <AvatarImage src={item.avatarUrl} alt={displayName} />}
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="min-w-0 flex-1 space-y-1">
        {/* User: name + username on one line */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{userLine}</span>
          {item.abnormal && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-300 gap-0.5"
            >
              <AlertTriangle className="h-3 w-3" /> Bất thường
            </Badge>
          )}
        </div>

        {/* Badges row: action | status | severity */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
            {item.actionLabel ?? item.actionType}
          </Badge>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusCfg.className}`}>
            {statusCfg.label}
          </Badge>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${severityCfg.className}`}>
            {severityCfg.label}
          </Badge>
        </div>

        {/* Description */}
        {item.description && (
          <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
        )}
      </div>

      {/* Time */}
      <div className="text-right shrink-0 min-w-[52px]">
        <p className="text-xs font-medium tabular-nums">{timeOnly}</p>
        <p className="text-[10px] text-muted-foreground whitespace-nowrap" title={fullDate}>
          {createdDate?.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
        </p>
        {item.ipAddress && (
          <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">{item.ipAddress}</p>
        )}
      </div>
    </button>
  );
};

export default ActivityLogItemRow;
