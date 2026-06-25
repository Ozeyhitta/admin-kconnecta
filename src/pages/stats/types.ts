/** Types mirroring GET /api/v1/admin/stats/engagement-analytics */

export interface AnalyticsChartPoint {
  date: string;
  label: string;
  count: number;
}

export interface AnalyticsInsight {
  type: string;
  level: "info" | "warning" | "danger" | "success";
  title: string;
  message: string;
  actionSuggestion?: string;
}

export interface DauMauSummary {
  dauToday: number;
  mau30Days: number;
  dauMauRatio: number;
  averageDau30Days: number;
  peakDauDay: string | null;
  peakDauCount: number;
  dauTrendStatus: string;
  consecutiveDauDropDays: number;
  previousPeriodDau: number;
  dauGrowthRate: number | null;
}

export interface DauMauAnalytics {
  summary: DauMauSummary;
  chartData: AnalyticsChartPoint[];
  insights: AnalyticsInsight[];
}

export interface InteractionBreakdownItem {
  type: string;
  count: number;
  percentage: number;
}

export interface InteractionSummary {
  totalInteractions: number;
  averageInteractionsPerDay: number;
  peakInteractionDay: string | null;
  peakInteractionCount: number;
  interactionTrendStatus: string;
  interactionGrowthRate: number | null;
  topInteractionType: string | null;
}

export interface InteractionAnalytics {
  summary: InteractionSummary;
  breakdown: InteractionBreakdownItem[];
  chartData: AnalyticsChartPoint[];
  insights: AnalyticsInsight[];
}

export interface EngagementAnalyticsResponse {
  dauMau: DauMauAnalytics;
  interactions: InteractionAnalytics;
}

export const BREAKDOWN_COLORS: Record<string, string> = {
  "Bài đăng": "#6366f1",
  "Bình luận": "#ec4899",
  "Cảm xúc": "#ef4444",
  "Chia sẻ": "#f59e0b",
  "Kết bạn": "#10b981",
};

export const INTERACTION_TYPE_TO_ACTION: Record<string, string> = {
  "Bài đăng": "POST_CREATED",
  "Bình luận": "COMMENT_ADDED",
  "Cảm xúc": "REACTION_ADDED",
  "Chia sẻ": "POST_SHARED",
  "Kết bạn": "FRIEND_REQUEST_SENT",
};

export type InteractionChartSelection =
  | { kind: "day"; date: string; label: string }
  | { kind: "type"; type: string; actionType: string };

export interface InteractionDetailResponse {
  mode: "day" | "type";
  title: string;
  totalCount: number;
  breakdown: InteractionBreakdownItem[];
  chartData: AnalyticsChartPoint[];
  recentLogs: InteractionActivityLogItem[];
}

export interface InteractionActivityLogItem {
  id: string;
  userId?: string | null;
  username?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  actionType?: string | null;
  actionLabel?: string | null;
  description?: string | null;
  createdAt?: string | null;
}
