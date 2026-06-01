import type { AiInsight, PolicyConfig } from "./types";

/** Demo insights — có thể thay bằng API /analytics sau */
export const buildPolicyInsights = (config: PolicyConfig): AiInsight[] => {
  const toxicRules = config.communityRules.filter(
    (r) => r.enabled && (r.id === "toxic" || r.id === "spam" || r.id === "scam")
  ).length;
  const keywordCount = config.keywords.length;
  const spamRulesOn = config.communityRules.find((r) => r.id === "spam")?.enabled;

  const insights: AiInsight[] = [
    {
      id: "insight-crypto-spam",
      type: "new_violation_trend",
      title: "Spam link crypto tăng mạnh",
      description:
        "Trong 7 ngày qua, spam link crypto tăng 35%. Nhiều bài chứa domain lạ và CTA đầu tư.",
      changePercent: 35,
      severity: "high",
      periodDays: 7,
    },
    {
      id: "insight-toxic-topic",
      type: "toxic_topic",
      title: "Chủ đề dễ gây toxic",
      description:
        "Các thread bàn luận chính trị / drama idol có tỷ lệ toxic score > 70 cao gấp 2.1 lần trung bình.",
      severity: "medium",
      periodDays: 14,
    },
    {
      id: "insight-keyword",
      type: "keyword_spike",
      title: "Từ khóa nhạy cảm tăng",
      description: `Phát hiện ${keywordCount} từ khóa đang theo dõi; 12 từ mới xuất hiện > 50 lần/tuần (mock).`,
      changePercent: 18,
      severity: "medium",
      periodDays: 7,
    },
    {
      id: "insight-spam-cluster",
      type: "spam_cluster",
      title: "Nhóm spam bất thường",
      description:
        "3 cụm tài khoản mới (< 7 ngày) gửi > 40 tin/phút trong cùng phòng chat.",
      severity: "critical",
      periodDays: 3,
    },
  ];

  if (!spamRulesOn) {
    insights.push({
      id: "insight-spam-off",
      type: "new_violation_trend",
      title: "Rule spam đang tắt",
      description: "Bật rule Spam trong Chính sách cộng đồng để giảm false negative.",
      severity: "low",
      periodDays: 1,
    });
  }

  if (toxicRules < 2) {
    insights.push({
      id: "insight-rules",
      type: "new_violation_trend",
      title: "Ít rule moderation đang bật",
      description: `Chỉ ${toxicRules} nhóm rule toxic/spam/scam đang active — cân nhắc bật thêm.`,
      severity: "low",
      periodDays: 1,
    });
  }

  return insights;
};
