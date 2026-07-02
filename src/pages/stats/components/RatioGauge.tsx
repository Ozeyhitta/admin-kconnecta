import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/common/tooltip";

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
              className="text-muted-foreground/80 hover:text-muted-foreground cursor-pointer"
              aria-label="Giải thích công thức DAU/MAU"
            >
              <Info className="h-3.5 w-3.5 text-sky-500" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6} className="max-w-xs text-left p-3 leading-relaxed">
            <div className="space-y-2 text-xs">
              <p className="font-semibold text-primary border-b pb-1.5 text-sm">Chỉ số gắn kết (DAU/MAU)</p>
              <div className="space-y-1.5 text-muted-foreground">
                <p>
                  <strong className="text-foreground">DAU (Daily Active Users):</strong> Số người dùng hoạt động trong một ngày.
                </p>
                <p>
                  <strong className="text-foreground">MAU (Monthly Active Users):</strong> Số người dùng hoạt động trong 30 ngày gần nhất.
                </p>
                <p className="pt-1 text-foreground font-medium">Ý nghĩa độ gắn kết (Stickiness):</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li><span className="font-semibold text-foreground">100%</span>: Người dùng truy cập ứng dụng mỗi ngày.</li>
                  <li><span className="font-semibold text-foreground">&gt;20%</span>: Ngưỡng gắn kết tốt của các mạng xã hội phổ biến.</li>
                  <li><span className="font-semibold text-foreground">&gt;40%</span>: Ngưỡng gắn kết xuất sắc (Facebook, WhatsApp...).</li>
                </ul>
              </div>
              <p className="text-[11px] pt-1.5 border-t border-border font-medium text-foreground leading-normal">
                Công thức: (TB DAU mỗi ngày ÷ MAU 30 ngày) × 100%
              </p>
            </div>
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
