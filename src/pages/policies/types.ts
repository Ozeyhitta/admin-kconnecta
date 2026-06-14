export type Severity = "low" | "medium" | "high" | "critical";

export type CommunityRuleId =
  | "banned_content"
  | "spam"
  | "toxic"
  | "fake_news"
  | "nsfw"
  | "scam"
  | "violence";

export interface CommunityRule {
  id: CommunityRuleId;
  label: string;
  description: string;
  enabled: boolean;
  severity: Severity;
}

export type KeywordCategory = "blacklist" | "sensitive" | "blocked_domain";

export interface KeywordEntry {
  id: string;
  value: string;
  category: KeywordCategory;
  note?: string;
}

export type ViolationActionType = "warning" | "lock_temp" | "ban_permanent";

export interface ViolationStep {
  offense: 1 | 2 | 3;
  action: ViolationActionType;
  lockDays?: number;
}

export interface ViolationPolicyByType {
  id: string;
  label: string;
  steps: ViolationStep[];
}

export interface AiDetectionFlags {
  toxic: boolean;
  spam: boolean;
  nsfw: boolean;
  hateSpeech: boolean;
  scam: boolean;
}

export interface AiModerationConfig {
  enabled: boolean;
  sensitivity: number;
  detect: AiDetectionFlags;
  autoHidePost: boolean;
  autoWarning: boolean;
  autoBan: boolean;
}

export interface PrivacyPolicyConfig {
  storeProfile: boolean;
  storePosts: boolean;
  storeChat: boolean;
  storeActivityLog: boolean;
  logRetentionDays: number;
  chatRetentionDays: number;
  allowDataExport: boolean;
  allowAccountDeletion: boolean;
  cookiePolicyEnabled: boolean;
  sessionMaxHours: number;
}

export interface PostPolicyConfig {
  maxPostLength: number;
  maxImagesPerPost: number;
  maxVideoMb: number;
  allowedFileTypes: string;
  postsPerMinute: number;
}

export interface ChatPolicyConfig {
  antiSpamEnabled: boolean;
  blockMaliciousLinks: boolean;
  messagesPerMinute: number;
  aiScanEnabled: boolean;
}

export interface RecommendationConfig {
  prioritizeHot: boolean;
  prioritizeFriends: boolean;
  prioritizeTopics: boolean;
  reduceToxicContent: boolean;
  weights: {
    engagement: number;
    friends: number;
    trending: number;
    newContent: number;
  };
}

export type RuleConditionField =
  | "spam_score"
  | "toxic_score"
  | "nsfw_score"
  | "links_per_minute"
  | "messages_per_minute"
  | "keyword_match";

export type RuleConditionOperator = "gt" | "gte" | "eq";

export interface RuleCondition {
  id: string;
  field: RuleConditionField;
  operator: RuleConditionOperator;
  value: number;
}

export type RuleActionType = "mute" | "warning" | "hide_post" | "lock" | "ban";

export interface RuleEngineRule {
  id: string;
  name: string;
  enabled: boolean;
  logic: "AND" | "OR";
  conditions: RuleCondition[];
  action: RuleActionType;
  actionDurationMinutes?: number;
  severity: Severity;
}

export type DiffKind = "added" | "removed" | "updated";

export interface DiffEntry {
  field: string;
  label: string;
  kind: DiffKind;
  before: unknown;
  after: unknown;
}

export interface PolicyAuditEntry {
  id: string;
  section: string;
  adminLabel: string;
  changedAt: string;
  summary: string;
  diffs: DiffEntry[];
  beforeJson: string;
  afterJson: string;
}

export type AiInsightType =
  | "keyword_spike"
  | "toxic_topic"
  | "spam_cluster"
  | "new_violation_trend";

export interface AiInsight {
  id: string;
  type: AiInsightType;
  title: string;
  description: string;
  changePercent?: number;
  severity: Severity;
  periodDays: number;
}

export interface PolicyConfig {
  communityRules: CommunityRule[];
  keywords: KeywordEntry[];
  violationPolicies: ViolationPolicyByType[];
  aiModeration: AiModerationConfig;
  privacy: PrivacyPolicyConfig;
  postPolicy: PostPolicyConfig;
  chatPolicy: ChatPolicyConfig;
  recommendation: RecommendationConfig;
  ruleEngine: RuleEngineRule[];
  auditLog: PolicyAuditEntry[];
}

export type PolicySectionKey =
  | "community"
  | "keywords"
  | "violations"
  | "ai"
  | "privacy"
  | "posts"

  | "recommendation"
  | "audit"
  | "insights"
  | "rules";
