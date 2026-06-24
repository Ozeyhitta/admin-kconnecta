import type { PostTrendsResponse, TopicTrend, TopPost } from "./types";

export const fmt = new Intl.NumberFormat("vi-VN");

export const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });

export const formatDateTime = (iso: string | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const reportRatePercent = (reports: number, interactions: number): number | null => {
  if (interactions <= 0) return null;
  return (reports / interactions) * 100;
};

export function exportTopicsCsv(topics: TopicTrend[]) {
  const header = ["Chủ đề", "Số bài", "Điểm", "Tăng trưởng %", "Phân loại", "Báo cáo", "Bình luận"];
  const rows = topics.map((t) => [
    t.topic,
    t.postCount,
    t.topicScore,
    t.growthRate.toFixed(1),
    t.trendLabel,
    t.reportCount,
    t.commentCount,
  ]);
  downloadCsv("chu-de-xu-huong.csv", [header, ...rows]);
}

export function exportPostsCsv(posts: TopPost[]) {
  const header = [
    "Post ID", "Tác giả", "Điểm", "Tăng trưởng %", "Like", "Comment", "Share", "Report", "Phân loại", "Chủ đề", "Nội dung",
  ];
  const rows = posts.map((p) => [
    p.postId,
    p.authorName ?? p.authorUsername ?? "",
    p.trendScore,
    p.growthRate.toFixed(1),
    p.likeCount,
    p.commentCount,
    p.shareCount,
    p.reportCount,
    p.trendLabel,
    p.topics.join(";"),
    (p.content ?? "").replace(/\n/g, " "),
  ]);
  downloadCsv("bai-viet-noi-bat.csv", [header, ...rows]);
}

export const adminPostShowPath = (postId: string) => `/posts/${postId}/show`;

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const body = rows.map((r) => r.map(escape).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildTopicInsight(data: PostTrendsResponse | null): string {
  if (!data?.summary) return "";
  const s = data.summary;
  if (s.totalPosts === 0) return "Chưa có bài viết có tương tác trong kỳ.";

  const parts = [
    `${fmt.format(s.totalPosts)} bài có tương tác.`,
    `${s.hashtagCoveragePercent.toFixed(0)}% có #hashtag (${fmt.format(s.postsWithHashtag)} bài).`,
    `${fmt.format(s.postsWithKeywordOnly)} bài được gán từ khóa tự động.`,
    `${fmt.format(s.postsUncategorized)} bài chưa phân loại được.`,
  ];

  if (s.topHashtagTopic) {
    parts.push(`Hashtag dẫn đầu: #${s.topHashtagTopic} (${fmt.format(s.topHashtagTopicScore)} điểm).`);
  }
  if (s.topKeywordTopic) {
    parts.push(`Từ khóa dẫn đầu: ⌗${s.topKeywordTopic} (${fmt.format(s.topKeywordTopicScore)} điểm).`);
  }

  return parts.join(" ");
}
