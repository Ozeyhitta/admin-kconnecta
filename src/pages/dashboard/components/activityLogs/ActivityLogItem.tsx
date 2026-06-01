import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { STATUS_LABELS, SEVERITY_LABELS, timeFormatter } from "./activityLogConstants";
import type { ActivityLogItem } from "./types";

interface Props {
  item: ActivityLogItem;
  onClick?: (item: ActivityLogItem) => void;
}

export const ActivityLogItemRow = ({ item, onClick }: Props) => {
  const statusCfg = STATUS_LABELS[item.status] ?? STATUS_LABELS.SUCCESS;
  const severityCfg = SEVERITY_LABELS[item.severity] ?? SEVERITY_LABELS.INFO;
  const displayName = item.fullName ?? item.username ?? "Không rõ";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <button
      type="button"
      onClick={() => onClick?.(item)}
      className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b last:border-b-0"
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Avatar className="h-9 w-9 shrink-0 mt-0.5">
              {item.avatarUrl && <AvatarImage src={item.avatarUrl} alt={displayName} />}
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          {item.userId && (
            <TooltipContent side="right">
              <p className="font-medium">{displayName}</p>
              {item.username && <p className="text-xs opacity-80">@{item.username}</p>}
              <p className="text-[10px] opacity-60 font-mono mt-1">{item.userId}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="font-medium text-sm truncate max-w-[180px]">{displayName}</span>
              </TooltipTrigger>
              <TooltipContent>
                {displayName}{item.username ? ` (@${item.username})` : ""}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {item.username && (
            <span className="text-xs text-muted-foreground truncate max-w-[100px]" title={`@${item.username}`}>
              @{item.username}
            </span>
          )}
          {item.abnormal && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-300 gap-0.5">
              <AlertTriangle className="h-3 w-3" /> Bất thường
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap mt-1">
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

        {item.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{item.description}</p>
        )}
      </div>

      <div className="text-right shrink-0">
        <p className="text-xs text-muted-foreground whitespace-nowrap">
          {item.createdAt ? timeFormatter.format(new Date(item.createdAt)) : "—"}
        </p>
        {item.ipAddress && (
          <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">{item.ipAddress}</p>
        )}
      </div>
    </button>
  );
};

export default ActivityLogItemRow;
