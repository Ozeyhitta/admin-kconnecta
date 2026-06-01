/** DAU/MAU ratio gauge — extracted for reuse. */
export const RatioGauge = ({ ratio }: { ratio: number }) => {
  const pct = Math.min(ratio, 100);
  const color = pct >= 20 ? "#10b981" : pct >= 10 ? "#f59e0b" : "#ef4444";
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
      <p className="text-xs text-muted-foreground text-center">DAU / MAU</p>
      <p className="text-xs text-center font-medium" style={{ color }}>
        {pct >= 20 ? "Tốt" : pct >= 10 ? "Trung bình" : "Thấp"}
      </p>
    </div>
  );
};

export default RatioGauge;
