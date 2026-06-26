import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/common/tooltip";

const FORMULA_TOOLTIP =
  "DAU/MAU (TB DAU / MAU) = TB DAU/ngày ÷ MAU 30 ngày × 100. Đây là công thức chuẩn sản phẩm; khác với trường backend dauMauRatio (DAU mới nhất ÷ MAU).";

/** DAU/MAU ratio gauge — extracted for reuse. */
export const RatioGauge = ({ ratio }: { ratio: number }) => {
  const pct = Math.min(ratio, 100);
  const color = pct > 40 ? "#10b981" : pct >= 20 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
          <circle
            cx="18" cy="18" r="15.9" fill="none"
            stroke={color} strokeWidth="3"
            strokeDasharray={`${pct} ${100 - pct}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold tabular-nums" style={{ color }}>{ratio.toFixed(1)}%</span>
        </div>
      </div>
      <div className="flex items-center justify-center gap-1">
        <p className="text-xs text-muted-foreground text-center">DAU/MAU (TB DAU / MAU)</p>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground/80 hover:text-muted-foreground"
              aria-label="Giải thích công thức DAU/MAU"
            >
              <Info className="h-3 w-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6} className="max-w-xs text-left leading-relaxed">
            {FORMULA_TOOLTIP}
          </TooltipContent>
        </Tooltip>
      </div>
      <p className="text-xs text-center font-medium" style={{ color }}>
        {pct > 40 ? "Tốt" : pct >= 20 ? "Trung bình" : "Cần cải thiện"}
      </p>
    </div>
  );
};

export default RatioGauge;
