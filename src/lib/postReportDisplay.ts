export type ReportCategory =
  | "SPAM"
  | "VIOLENCE"
  | "HATE_SPEECH"
  | "NUDITY"
  | "MISINFORMATION"
  | "OTHER";

export const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  SPAM: "Spam / Quảng cáo",
  VIOLENCE: "Bạo lực",
  HATE_SPEECH: "Ngôn ngữ thù địch",
  NUDITY: "Nội dung khiêu dâm",
  MISINFORMATION: "Thông tin sai lệch",
  OTHER: "Lý do khác",
};

export function reportCategoryLabel(category?: string | null): string | null {
  if (!category) return null;
  return REPORT_CATEGORY_LABELS[category as ReportCategory] ?? category;
}

export function formatPostReportReason(
  reason?: string | null,
  category?: string | null,
): string {
  const text = (reason ?? "").trim();
  if (text) return text;
  const categoryLabel = reportCategoryLabel(category);
  if (categoryLabel) return categoryLabel;
  return "Người dùng báo cáo từ menu bài viết";
}
