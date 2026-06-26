import type {
  AnalyticsChartPoint,
  AnalyticsInsight,
  InteractionBreakdownItem,
  InteractionSummary,
} from "../types";

const fmt = new Intl.NumberFormat("vi-VN");
const fmtPct = new Intl.NumberFormat("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Deterministic thresholds for interaction alerts. */
export const INTERACTION_ALERT_THRESHOLDS = {
  /** Total interactions drop vs previous period → danger */
  GROWTH_DANGER_DROP: -20,
  /** Total interactions rise vs previous period → success */
  GROWTH_SUCCESS_RISE: 20,
  /** Posts share of total interactions → warning */
  POSTS_SHARE_WARNING: 15,
  /** Consecutive daily decreases required → warning */
  CONSECUTIVE_DROP_DAYS: 3,
  /** comments + reactions must exceed posts × this for mild content-creation hint */
  RESPONSE_TO_POSTS_RATIO: 2,
} as const;

const POST_TYPE = "Bài đăng";
const COMMENT_TYPE = "Bình luận";
const REACTION_TYPE = "Cảm xúc";

function formatSignedPct(value: number): string {
  return `${value >= 0 ? "+" : ""}${fmtPct.format(value)}%`;
}

function findBreakdownItem(breakdown: InteractionBreakdownItem[], type: string): InteractionBreakdownItem | undefined {
  return breakdown.find((b) => b.type === type);
}

function hasPreviousPeriodDelta(item: InteractionBreakdownItem | undefined): item is InteractionBreakdownItem & {
  previousCount: number;
  deltaPercentage: number;
} {
  return item != null && item.previousCount != null && item.deltaPercentage != null;
}

/** Longest run of strictly decreasing daily counts in chartData (sorted by date). */
export function countMaxConsecutiveDailyDrops(chartData: AnalyticsChartPoint[]): number {
  if (chartData.length < 2) return 0;

  const sorted = [...chartData].sort((a, b) => a.date.localeCompare(b.date));
  let maxStreak = 0;
  let streak = 0;

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].count < sorted[i - 1].count) {
      streak += 1;
      maxStreak = Math.max(maxStreak, streak);
    } else {
      streak = 0;
    }
  }

  return maxStreak;
}

/**
 * Compute interaction alerts from summary, breakdown, and daily chart data.
 * Returns only insights backed by available data — no speculative alerts.
 */
export function computeInteractionAlerts(
  summary: InteractionSummary,
  breakdown: InteractionBreakdownItem[],
  chartData: AnalyticsChartPoint[],
): AnalyticsInsight[] {
  const insights: AnalyticsInsight[] = [];
  const totalInteractions = summary.totalInteractions;
  const growthRate = summary.interactionGrowthRate;

  // 1) Total interactions decrease >20% vs previous period → danger
  if (growthRate != null && growthRate < INTERACTION_ALERT_THRESHOLDS.GROWTH_DANGER_DROP) {
    insights.push({
      type: "interaction_drop_severe",
      level: "danger",
      title: "Tổng tương tác giảm mạnh",
      message: `Tổng tương tác giảm ${formatSignedPct(growthRate)} so với kỳ trước (ngưỡng cảnh báo: ${INTERACTION_ALERT_THRESHOLDS.GROWTH_DANGER_DROP}%).`,
      actionSuggestion: "Rà soát sự cố hệ thống, nội dung mới và chiến dịch thu hút để xác định nguyên nhân giảm.",
    });
  }

  // 2) Interactions decrease 3 consecutive days → warning (from chartData)
  if (chartData.length >= INTERACTION_ALERT_THRESHOLDS.CONSECUTIVE_DROP_DAYS + 1) {
    const consecutiveDrops = countMaxConsecutiveDailyDrops(chartData);
    if (consecutiveDrops >= INTERACTION_ALERT_THRESHOLDS.CONSECUTIVE_DROP_DAYS) {
      insights.push({
        type: "interaction_consecutive_drop",
        level: "warning",
        title: "Giảm liên tiếp nhiều ngày",
        message: `Lượt tương tác giảm ${consecutiveDrops} ngày liên tiếp trong kỳ (ngưỡng: ${INTERACTION_ALERT_THRESHOLDS.CONSECUTIVE_DROP_DAYS} ngày).`,
        actionSuggestion: "Theo dõi thêm 1–2 ngày; nếu tiếp tục giảm, kiểm tra push thông báo và nội dung nổi bật.",
      });
    }
  }

  const postsItem = findBreakdownItem(breakdown, POST_TYPE);
  const commentsItem = findBreakdownItem(breakdown, COMMENT_TYPE);
  const reactionsItem = findBreakdownItem(breakdown, REACTION_TYPE);

  // 3) Posts below 15% of total interactions → warning
  if (totalInteractions > 0 && postsItem != null && postsItem.count > 0) {
    if (postsItem.percentage < INTERACTION_ALERT_THRESHOLDS.POSTS_SHARE_WARNING) {
      insights.push({
        type: "posts_share_low",
        level: "warning",
        title: "Tỷ lệ bài đăng thấp",
        message: `Bài đăng chỉ chiếm ${fmtPct.format(postsItem.percentage)}% tổng tương tác (dưới ngưỡng ${INTERACTION_ALERT_THRESHOLDS.POSTS_SHARE_WARNING}%).`,
        actionSuggestion: "Khuyến khích người dùng tạo nội dung mới qua gợi ý đăng bài, thử thách hoặc ưu đãi.",
      });
    }
  }

  // 4) Comments or reactions up but posts down → info (requires previous-period breakdown)
  if (
    hasPreviousPeriodDelta(postsItem) &&
    hasPreviousPeriodDelta(commentsItem) &&
    hasPreviousPeriodDelta(reactionsItem)
  ) {
    const postsDown = postsItem.deltaPercentage < 0;
    const engagementUp = commentsItem.deltaPercentage > 0 || reactionsItem.deltaPercentage > 0;
    if (postsDown && engagementUp) {
      const parts: string[] = [];
      if (commentsItem.deltaPercentage > 0) {
        parts.push(`bình luận ${formatSignedPct(commentsItem.deltaPercentage)}`);
      }
      if (reactionsItem.deltaPercentage > 0) {
        parts.push(`cảm xúc ${formatSignedPct(reactionsItem.deltaPercentage)}`);
      }
      insights.push({
        type: "growth_quality_mixed",
        level: "info",
        title: "Tăng trưởng thiên về phản hồi",
        message: `Bài đăng giảm ${formatSignedPct(postsItem.deltaPercentage)} so với kỳ trước, trong khi ${parts.join(" và ")} tăng.`,
        actionSuggestion: "Tăng trưởng đang đến từ tương tác cũ hơn nội dung mới — cân nhắc khuyến khích đăng bài để duy trì chất lượng tăng trưởng.",
      });
    }
  }

  // 5) Interactions increase above 20% → success
  if (growthRate != null && growthRate > INTERACTION_ALERT_THRESHOLDS.GROWTH_SUCCESS_RISE) {
    insights.push({
      type: "interaction_growth_strong",
      level: "success",
      title: "Tăng trưởng tương tác tốt",
      message: `Tổng tương tác tăng ${formatSignedPct(growthRate)} so với kỳ trước (trên ngưỡng +${INTERACTION_ALERT_THRESHOLDS.GROWTH_SUCCESS_RISE}%).`,
      actionSuggestion: "Duy trì chiến lược hiện tại và theo dõi breakdown loại tương tác để cân bằng nội dung.",
    });
  }

  // Mild suggestion: response-heavy but posts still above 15% threshold
  if (
    totalInteractions > 0 &&
    postsItem != null &&
    postsItem.count > 0 &&
    postsItem.percentage >= INTERACTION_ALERT_THRESHOLDS.POSTS_SHARE_WARNING
  ) {
    const comments = commentsItem?.count ?? 0;
    const reactions = reactionsItem?.count ?? 0;
    const posts = postsItem.count;
    if (comments + reactions > posts * INTERACTION_ALERT_THRESHOLDS.RESPONSE_TO_POSTS_RATIO) {
      insights.push({
        type: "content_creation_mild",
        level: "info",
        title: "Phản hồi vượt tạo nội dung",
        message: `Bài đăng chiếm ${fmtPct.format(postsItem.percentage)}% tổng tương tác; bình luận và cảm xúc (${fmt.format(comments + reactions)} lượt) gấp hơn ${INTERACTION_ALERT_THRESHOLDS.RESPONSE_TO_POSTS_RATIO} lần số bài đăng (${fmt.format(posts)}).`,
        actionSuggestion: "Người dùng phản hồi nhiều hơn tạo nội dung, nên khuyến khích đăng bài.",
      });
    }
  }

  return sortInsightsByPriority(insights);
}

const LEVEL_PRIORITY: Record<AnalyticsInsight["level"], number> = {
  danger: 0,
  warning: 1,
  success: 2,
  info: 3,
};

function sortInsightsByPriority(insights: AnalyticsInsight[]): AnalyticsInsight[] {
  return [...insights].sort((a, b) => LEVEL_PRIORITY[a.level] - LEVEL_PRIORITY[b.level]);
}
