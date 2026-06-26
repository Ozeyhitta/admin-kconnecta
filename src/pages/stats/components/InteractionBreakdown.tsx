import * as React from "react";
import { ArrowDownRight, ArrowUpRight, Crown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { BREAKDOWN_COLORS, INTERACTION_TYPE_TO_ACTION, type InteractionBreakdownItem, type InteractionSummary } from "../types";

const fmt = new Intl.NumberFormat("vi-VN");

interface InteractionBreakdownProps {
  breakdown: InteractionBreakdownItem[];
  summary: InteractionSummary | null;
  loading?: boolean;
  emptyMessage?: string;
  activeInteractionType?: string;
  onTypeClick?: (item: InteractionBreakdownItem) => void;
}

export const InteractionBreakdown = ({
  breakdown,
  summary,
  loading,
  emptyMessage = "Chưa có tương tác trong kỳ này",
  activeInteractionType = "all",
  onTypeClick,
}: InteractionBreakdownProps) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
      </div>
    );
  }

  const total = breakdown.reduce((s, i) => s + i.count, 0);

  if (total === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-10">
        {emptyMessage}
      </p>
    );
  }

  const displayRows = buildDisplayRows(breakdown, total);
  const hasDeltaData = hasBreakdownDeltaData(breakdown);
  const topType = summary?.topInteractionType;
  const topItem = (
    (topType != null ? displayRows.find((b) => b.type === topType) : undefined)
    ?? [...displayRows].sort((a, b) => b.count - a.count)[0]
  );
  const commentNotes = buildBreakdownNotes(displayRows, topItem);

  return (
    <div className="space-y-3">
      {topItem && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
          <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          <span>
            <strong>{topItem.type}</strong> chiếm {topItem.displayPercentage}% — loại tương tác nổi bật nhất
          </span>
        </div>
      )}

      {displayRows.map(item => {
        const isTop = item.type === topItem?.type && item.count > 0;
        const isActiveFilter = activeInteractionType !== "all"
          && INTERACTION_TYPE_TO_ACTION[item.type] === activeInteractionType;
        const color = BREAKDOWN_COLORS[item.type] ?? "#94a3b8";
        const clickable = Boolean(onTypeClick) && item.count > 0;
        const deltaView = getDeltaView(item);
        return (
          <div
            key={item.type}
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
            className={[
              "rounded-md -mx-1 px-1.5 py-1.5 transition-colors",
              clickable ? "cursor-pointer hover:bg-muted/60" : "",
              isTop ? "ring-1 ring-amber-300 bg-amber-50/40" : "",
              isActiveFilter && !isTop ? "ring-1 ring-sky-300 bg-sky-50/40" : "",
            ].join(" ").trim()}
            onClick={clickable ? () => onTypeClick?.(item) : undefined}
            onKeyDown={clickable ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onTypeClick?.(item);
              }
            } : undefined}
          >
            <div className="flex justify-between text-sm mb-1">
              <span className={`font-medium ${isTop ? "text-amber-700" : ""}`}>
                {isTop && "★ "}{item.type}
              </span>
              <div className="flex items-center gap-2 tabular-nums text-muted-foreground">
                <span>
                  {fmt.format(item.count)} <span className="text-xs">({item.displayPercentage}%)</span>
                </span>
                {hasDeltaData && (
                  <span
                    className={["inline-flex items-center gap-0.5 text-xs", deltaView.color].join(" ")}
                    title="So với kỳ trước"
                  >
                    {deltaView.icon}
                    {deltaView.text}
                  </span>
                )}
              </div>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${item.displayPercentage}%`,
                  backgroundColor: color,
                  opacity: isTop ? 1 : 0.75,
                }}
              />
            </div>
          </div>
        );
      })}

      <p className="text-xs text-muted-foreground text-right pt-1">
        Tổng: {fmt.format(total)}
        {onTypeClick && " · Nhấn loại để lọc biểu đồ"}
      </p>
      {commentNotes.length > 0 && (
        <div className="text-xs text-muted-foreground italic border-t pt-2 leading-relaxed space-y-1">
          {commentNotes.map((note) => (
            <p key={note}>💡 {note}</p>
          ))}
        </div>
      )}
    </div>
  );
};

type DisplayInteractionItem = InteractionBreakdownItem & {
  displayPercentage: number;
};

function hasBreakdownDeltaData(breakdown: InteractionBreakdownItem[]): boolean {
  return breakdown.some(
    (item) => item.deltaPercentage != null || typeof item.previousCount === "number",
  );
}

function buildDisplayRows(breakdown: InteractionBreakdownItem[], total: number): DisplayInteractionItem[] {
  if (total <= 0) {
    return breakdown.map((item) => ({ ...item, displayPercentage: 0 }));
  }
  const base = breakdown.map((item) => {
    const exact = (item.count / total) * 100;
    const floor = Math.floor(exact);
    return {
      item,
      floor,
      remainder: exact - floor,
    };
  });
  const allocated = base.reduce((sum, entry) => sum + entry.floor, 0);
  let remaining = Math.max(0, 100 - allocated);
  const sortedByRemainder = [...base].sort((a, b) => b.remainder - a.remainder);
  const increments = new Map<string, number>();
  for (const row of sortedByRemainder) {
    if (remaining <= 0) break;
    increments.set(row.item.type, 1);
    remaining -= 1;
  }
  return breakdown.map((item) => ({
    ...item,
    displayPercentage: Math.max(0, base.find((row) => row.item.type === item.type)!.floor + (increments.get(item.type) ?? 0)),
  }));
}

function getDeltaView(item: InteractionBreakdownItem): { text: string; icon: React.ReactNode; color: string } {
  let delta = item.deltaPercentage;
  if (delta == null && typeof item.previousCount === "number") {
    if (item.previousCount > 0) {
      delta = ((item.count - item.previousCount) / item.previousCount) * 100;
    } else if (item.count > 0) {
      delta = 100;
    } else {
      delta = 0;
    }
  }
  if (delta == null) {
    return { text: "—", icon: null, color: "text-muted-foreground" };
  }
  if (delta > 0) {
    return {
      text: `+${delta.toFixed(1)}%`,
      icon: <ArrowUpRight className="h-3 w-3" />,
      color: "text-emerald-600",
    };
  }
  if (delta < 0) {
    return {
      text: `${delta.toFixed(1)}%`,
      icon: <ArrowDownRight className="h-3 w-3" />,
      color: "text-red-600",
    };
  }
  return { text: "0.0%", icon: null, color: "text-slate-600" };
}

function buildBreakdownNotes(breakdown: DisplayInteractionItem[], top: DisplayInteractionItem | undefined): string[] {
  if (!top || top.count === 0) return [];
  const notes: string[] = [];
  const posts = breakdown.find((b) => b.type === "Bài đăng");

  if (top.type === "Bình luận") {
    notes.push("Bình luận chiếm tỷ trọng cao nhất, cho thấy người dùng phản hồi nhiều hơn tạo nội dung.");
  }
  if ((posts?.displayPercentage ?? 0) < 20) {
    notes.push("Tỷ lệ bài đăng còn thấp, nên khuyến khích người dùng tạo nội dung mới.");
  }
  if (notes.length === 0) {
    notes.push(`${top.type} đang dẫn đầu (${top.displayPercentage}%), cần tiếp tục cân bằng các loại tương tác còn lại.`);
  }
  return notes;
}

export default InteractionBreakdown;
