import { CircleHelp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/common/tooltip";
import { Button } from "@/components/ui/button";

export function ScoreFormulaHelp() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2 text-muted-foreground"
          aria-label="Cách tính điểm xu hướng"
        >
          <CircleHelp className="h-4 w-4" />
          <span className="hidden sm:inline">Cách tính điểm</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs text-left leading-relaxed">
        <p className="font-medium text-foreground">Điểm xu hướng</p>
        <p className="mt-1">
          Like × 1 + Bình luận × 2 + Chia sẻ × 3 − Báo cáo × 5.
        </p>
        <p className="mt-2 text-muted-foreground">
          Chủ đề được lấy từ hashtag đã gắn cho bài viết (bảng post_topics).
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
