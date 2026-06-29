import type { TopicTrend, TopPost } from "./types";

export const fmt = new Intl.NumberFormat("vi-VN");

export const formatDay = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
  });

export const formatFullDay = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

export const formatDateTime = (iso: string | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
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
  const header = [
    "Hashtag", "Số bài", "Like", "Bình luận", "Chia sẻ", "Báo cáo",
    "Điểm", "Tăng trưởng %", "Phân loại",
  ];
  const rows = topics.map((t) => [
    t.topic,
    t.postCount,
    t.likeCount ?? 0,
    t.commentCount,
    t.shareCount ?? 0,
    t.reportCount,
    t.topicScore,
    t.growthRate.toFixed(1),
    t.trendLabel,
  ]);
  downloadCsv("hashtag-xu-huong.csv", [header, ...rows]);
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
