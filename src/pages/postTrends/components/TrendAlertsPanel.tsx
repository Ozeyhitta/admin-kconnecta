import { Link } from "react-router";
import {
  Activity,
  AlertTriangle,
  ExternalLink,
  Flag,
  Flame,
  MessageSquareWarning,
  Rocket,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { TrendAlert } from "../types";
import { adminPostShowPath } from "../utils";

const ALERT_ICON: Record<string, React.FC<{ className?: string }>> = {
  REPORT_SPIKE: Flag,
  CONTROVERSIAL: MessageSquareWarning,
  VIRAL_POST: Flame,
  TOPIC_SURGE: Rocket,
};

const severityStyle = (severity: TrendAlert["severity"]) => {
  switch (severity) {
    case "HIGH":
      return {
        box: "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30",
        icon: "text-red-500",
        badge: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
      };
    case "MEDIUM":
      return {
        box: "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30",
        icon: "text-amber-500",
        badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
      };
    default:
      return {
        box: "border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/30",
        icon: "text-blue-500",
        badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
      };
  }
};

type TrendAlertsPanelProps = {
  alerts: TrendAlert[];
  loading: boolean;
};

export function TrendAlertsPanel({ alerts, loading }: TrendAlertsPanelProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-success-border bg-success-bg p-4 text-sm text-success-on-bg">
        <Activity className="h-4 w-4 shrink-0" />
        Không có cảnh báo nào trong kỳ này.
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
      {alerts.map((a) => {
        const s = severityStyle(a.severity);
        const Icon = ALERT_ICON[a.type] ?? AlertTriangle;
        const isPost = a.scope === "post" && a.targetId;
        const postPath = isPost ? adminPostShowPath(a.targetId) : null;

        const inner = (
          <>
            <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${s.icon}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">{a.title}</span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${s.badge}`}>
                  {a.severity}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{a.message}</p>
              <p className="text-[11px] text-muted-foreground/70 mt-1 truncate">↳ {a.targetLabel}</p>
              {postPath && (
                <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary">
                  <ExternalLink className="h-3 w-3" />
                  Xem bài viết
                </span>
              )}
            </div>
          </>
        );

        if (postPath) {
          return (
            <Link
              key={a.id}
              to={postPath}
              className={`flex gap-3 rounded-lg border p-3 transition-colors hover:opacity-90 ${s.box}`}
            >
              {inner}
            </Link>
          );
        }

        return (
          <div key={a.id} className={`flex gap-3 rounded-lg border p-3 ${s.box}`}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}
