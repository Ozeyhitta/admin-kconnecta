import * as React from "react";
import { ArrowDown, ArrowUp, Info, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/common/tooltip";

const fmt = new Intl.NumberFormat("vi-VN");

export type KpiComparisonTone = "positive" | "negative" | "neutral" | "warning";

export interface KpiComparison {
  label: string;
  tone: KpiComparisonTone;
}

const TONE_CLASS: Record<KpiComparisonTone, string> = {
  positive: "text-emerald-600",
  negative: "text-red-600",
  neutral: "text-sky-700",
  warning: "text-orange-600",
};

const TONE_ICON: Record<KpiComparisonTone, React.FC<{ className?: string }>> = {
  positive: ArrowUp,
  negative: ArrowDown,
  neutral: Minus,
  warning: Minus,
};

export interface AnalyticsKpiCardProps {
  title: string;
  tooltip?: string;
  value?: number | string;
  loading?: boolean;
  icon: React.FC<{ className?: string }>;
  iconColor?: string;
  format?: (v: number) => string;
  isText?: boolean;
  comparison?: KpiComparison | null;
  sub?: string;
}

export const AnalyticsKpiCard = ({
  title,
  tooltip,
  value,
  loading,
  icon: Icon,
  iconColor = "text-muted-foreground",
  format,
  isText,
  comparison,
  sub,
}: AnalyticsKpiCardProps) => {
  const ComparisonIcon = comparison ? TONE_ICON[comparison.tone] : null;

  return (
    <Card className="p-4 sm:p-5 h-full">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            {tooltip && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground/80 hover:text-muted-foreground"
                    aria-label={`Giải thích chỉ số ${title}`}
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={8} className="max-w-xs text-left leading-relaxed">
                  {tooltip}
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {loading ? (
            <Skeleton className="h-8 w-20 mt-2" />
          ) : (
            <p className={`mt-1.5 font-bold tabular-nums tracking-tight ${isText ? "text-base" : "text-xl sm:text-2xl"}`}>
              {value !== undefined
                ? typeof value === "number"
                  ? format
                    ? format(value)
                    : fmt.format(value)
                  : value
                : "—"}
            </p>
          )}

          {!loading && comparison && (
            <p className={`mt-1.5 inline-flex items-center gap-1 text-xs font-medium ${TONE_CLASS[comparison.tone]}`}>
              {ComparisonIcon && <ComparisonIcon className="h-3 w-3 shrink-0" />}
              {comparison.label}
            </p>
          )}

          {sub && !loading && <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{sub}</p>}
        </div>
        <Icon className={`h-5 w-5 sm:h-6 sm:w-6 shrink-0 opacity-50 mt-0.5 ${iconColor}`} />
      </div>
    </Card>
  );
};

export function growthToComparison(
  growthRate: number | null | undefined,
  options?: { hideWhenNull?: boolean },
): KpiComparison | null {
  if (growthRate == null) {
    return options?.hideWhenNull ? null : { label: "Chưa có dữ liệu kỳ trước", tone: "neutral" };
  }
  const signed = `${growthRate >= 0 ? "+" : ""}${growthRate.toFixed(1)}% so với kỳ trước`;
  if (growthRate > 5) return { label: signed, tone: "positive" };
  if (growthRate >= -5) return { label: signed, tone: "neutral" };
  if (growthRate >= -20) return { label: signed, tone: "warning" };
  return { label: signed, tone: "negative" };
}

export default AnalyticsKpiCard;
