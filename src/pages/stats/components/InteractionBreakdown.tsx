import { Crown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { BREAKDOWN_COLORS, type InteractionBreakdownItem, type InteractionSummary } from "../types";

const fmt = new Intl.NumberFormat("vi-VN");

interface InteractionBreakdownProps {
  breakdown: InteractionBreakdownItem[];
  summary: InteractionSummary | null;
  loading?: boolean;
}

export const InteractionBreakdown = ({ breakdown, summary, loading }: InteractionBreakdownProps) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
      </div>
    );
  }

  const total = breakdown.reduce((s, i) => s + i.count, 0);
  const topType = summary?.topInteractionType;

  if (total === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-10">
        Chưa có tương tác trong kỳ này
      </p>
    );
  }

  const topItem = breakdown.find(b => b.type === topType) ?? breakdown[0];
  const commentNote = buildBreakdownNote(breakdown, topItem);

  return (
    <div className="space-y-3">
      {topItem && topItem.percentage >= 40 && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
          <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          <span>
            <strong>{topItem.type}</strong> chiếm {topItem.percentage}% — loại tương tác nổi bật nhất
          </span>
        </div>
      )}

      {breakdown.map(item => {
        const isTop = item.type === topType && item.count > 0;
        const color = BREAKDOWN_COLORS[item.type] ?? "#94a3b8";
        return (
          <div key={item.type}>
            <div className="flex justify-between text-sm mb-1">
              <span className={`font-medium ${isTop ? "text-amber-700" : ""}`}>
                {isTop && "★ "}{item.type}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {fmt.format(item.count)} <span className="text-xs">({item.percentage}%)</span>
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${item.percentage}%`,
                  backgroundColor: color,
                  opacity: isTop ? 1 : 0.75,
                }}
              />
            </div>
          </div>
        );
      })}

      <p className="text-xs text-muted-foreground text-right pt-1">Tổng: {fmt.format(total)}</p>
      {commentNote && (
        <p className="text-xs text-muted-foreground italic border-t pt-2 leading-relaxed">
          💡 {commentNote}
        </p>
      )}
    </div>
  );
};

function buildBreakdownNote(breakdown: InteractionBreakdownItem[], top: InteractionBreakdownItem | undefined): string | null {
  if (!top || top.count === 0) return null;
  const posts = breakdown.find(b => b.type === "Bài đăng")?.count ?? 0;
  const comments = breakdown.find(b => b.type === "Bình luận")?.count ?? 0;
  const reactions = breakdown.find(b => b.type === "Cảm xúc")?.count ?? 0;

  if (posts > 0 && (comments + reactions) > posts * 2) {
    return "Người dùng phản hồi nhiều hơn tạo nội dung — cân nhắc khuyến khích đăng bài.";
  }
  if (top.percentage >= 40) {
    return `${top.type} đang chiếm ưu thế (${top.percentage}%). Có thể cần cân bằng các loại tương tác khác.`;
  }
  return null;
}

export default InteractionBreakdown;
