import type { PolicyConfig, RuleEngineRule } from "./types";

const uid = () => crypto.randomUUID();

const DEFAULT_RULE_ENGINE: RuleEngineRule[] = [
  {
    id: uid(),
    name: "Spam link hàng loạt",
    enabled: true,
    logic: "AND",
    severity: "high",
    conditions: [
      { id: uid(), field: "spam_score", operator: "gt", value: 80 },
      { id: uid(), field: "links_per_minute", operator: "gt", value: 5 },
    ],
    action: "mute",
    actionDurationMinutes: 60,
  },
];

export const createDefaultPolicyConfig = (): PolicyConfig => ({
  communityRules: [
    {
      id: "banned_content",
      label: "Nội dung bị cấm",
      description: "Nội dung vi phạm pháp luật hoặc bị cấm trên nền tảng",
      enabled: true,
      severity: "critical",
    },
    {
      id: "spam",
      label: "Spam",
      description: "Quảng cáo, lặp nội dung, flood",
      enabled: true,
      severity: "medium",
    },
    {
      id: "toxic",
      label: "Toxic / xúc phạm",
      description: "Ngôn từ thù ghét, quấy rối, xúc phạm",
      enabled: true,
      severity: "high",
    },
    {
      id: "fake_news",
      label: "Fake news",
      description: "Tin giả, thông tin sai lệch có hại",
      enabled: true,
      severity: "high",
    },
    {
      id: "nsfw",
      label: "Nội dung 18+",
      description: "Khiêu dâm, bạo lực graphic, nội dung người lớn",
      enabled: true,
      severity: "critical",
    },
    {
      id: "scam",
      label: "Lừa đảo",
      description: "Phishing, đa cấp, lừa đầu tư",
      enabled: true,
      severity: "critical",
    },
    {
      id: "violence",
      label: "Bạo lực",
      description: "Kích động, đe dọa, bạo lực thể xác",
      enabled: true,
      severity: "critical",
    },
  ],
  keywords: [
    { id: uid(), value: "từ tục", category: "blacklist", note: "Ví dụ" },
    { id: uid(), value: "casino", category: "blocked_domain", note: "Link cờ bạc" },
    { id: uid(), value: "bit.ly/phish", category: "blocked_domain", note: "Link phishing" },
    { id: uid(), value: "đầu tư 100%", category: "sensitive", note: "Nhạy cảm scam" },
  ],
  violationPolicies: [
    {
      id: "default",
      label: "Mặc định (mọi vi phạm)",
      steps: [
        { offense: 1, action: "warning" },
        { offense: 2, action: "lock_temp", lockDays: 3 },
        { offense: 3, action: "ban_permanent" },
      ],
    },
    {
      id: "spam",
      label: "Spam / quảng cáo",
      steps: [
        { offense: 1, action: "warning" },
        { offense: 2, action: "lock_temp", lockDays: 1 },
        { offense: 3, action: "lock_temp", lockDays: 7 },
      ],
    },
    {
      id: "toxic",
      label: "Toxic / hate speech",
      steps: [
        { offense: 1, action: "warning" },
        { offense: 2, action: "lock_temp", lockDays: 7 },
        { offense: 3, action: "ban_permanent" },
      ],
    },
  ],
  aiModeration: {
    enabled: true,
    sensitivity: 72,
    detect: {
      toxic: true,
      spam: true,
      nsfw: true,
      hateSpeech: true,
      scam: true,
    },
    autoHidePost: true,
    autoWarning: true,
    autoBan: false,
  },
  privacy: {
    storeProfile: true,
    storePosts: true,
    storeChat: true,
    storeActivityLog: true,
    logRetentionDays: 90,
    chatRetentionDays: 30,
    allowDataExport: true,
    allowAccountDeletion: true,
    cookiePolicyEnabled: true,
    sessionMaxHours: 168,
  },
  postPolicy: {
    maxPostLength: 5000,
    maxImagesPerPost: 10,
    maxVideoMb: 100,
    allowedFileTypes: "jpg,jpeg,png,gif,webp,mp4,mov",
    postsPerMinute: 3,
  },
  chatPolicy: {
    antiSpamEnabled: true,
    blockMaliciousLinks: true,
    messagesPerMinute: 20,
    aiScanEnabled: true,
  },
  recommendation: {
    prioritizeHot: true,
    prioritizeFriends: true,
    prioritizeTopics: true,
    reduceToxicContent: true,
    weights: {
      engagement: 40,
      friends: 30,
      trending: 20,
      newContent: 10,
    },
  },
  ruleEngine: DEFAULT_RULE_ENGINE,
  auditLog: [],
});
