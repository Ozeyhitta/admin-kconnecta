import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { AnalyticsInsight } from "../types";

const LEVEL_CONFIG = {
  danger: {
    bg: "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800",
    icon: XCircle,
    iconColor: "text-red-500",
  },
  warning: {
    bg: "bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800",
    icon: AlertTriangle,
    iconColor: "text-amber-500",
  },
  success: {
    bg: "bg-success-bg border-success-border",
    icon: CheckCircle2,
    iconColor: "text-success",
  },
  info: {
    bg: "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800",
    icon: Info,
    iconColor: "text-blue-500",
  },
} as const;

interface AnalyticsInsightCardsProps {
  insights: AnalyticsInsight[] | null;
  loading?: boolean;
  /** Max cards to show (default 5). */
  limit?: number;
  emptyMessage?: string;
}

export const AnalyticsInsightCards = ({
  insights,
  loading,
  limit = 5,
  emptyMessage = "Không có cảnh báo nào trong kỳ này.",
}: AnalyticsInsightCardsProps) => {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
      </div>
    );
  }

  const items = (insights ?? []).slice(0, limit);

  if (items.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-success-border bg-success-bg p-4 text-sm text-success-on-bg">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((ins, i) => {
        const cfg = LEVEL_CONFIG[ins.level as keyof typeof LEVEL_CONFIG] ?? LEVEL_CONFIG.info;
        const Icon = cfg.icon;
        return (
          <div key={`${ins.type}-${i}`} className={`flex items-start gap-3 rounded-lg border p-3 ${cfg.bg}`}>
            <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${cfg.iconColor}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug">{ins.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{ins.message}</p>
              {ins.actionSuggestion && (
                <p className="text-xs text-foreground/70 mt-1.5 italic">
                  💡 {ins.actionSuggestion}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AnalyticsInsightCards;
