import type { AiModerationConfig, KeywordCategory, KeywordEntry, PolicyConfig } from "./types";
import defaultConfigJson from "./default-config.json";

export const getDefaultPolicyConfig = (): PolicyConfig =>
  normalizePolicyConfig(defaultConfigJson as PolicyConfig);

// Mirrors backend default-config.json `aiModeration`. Used as the fallback so the
// admin tab renders even when the API returns no / partial aiModeration.
export const DEFAULT_AI_MODERATION: AiModerationConfig = {
  enabled: true,
  sensitivity: 72,
  detect: { toxic: true, spam: true, nsfw: true, hateSpeech: true, scam: true },
  autoHidePost: true,
  autoWarning: true,
  autoBan: false,
};

type RawKeyword = {
  id: string;
  value: string;
  category: string;
  group?: string;
  note?: string;
};

const normalizeKeywordCategory = (category: string): KeywordCategory => {
  if (category === "sensitive") return "watchlist";
  if (category === "blacklist" || category === "watchlist" || category === "blocked_domain") {
    return category;
  }
  return "blacklist";
};

export const mapKeywordsFromRaw = (raw: RawKeyword[]): KeywordEntry[] =>
  raw.map((k) => ({
    id: k.id,
    value: k.value,
    category: normalizeKeywordCategory(k.category),
    note: k.note ?? k.group,
  }));

export const normalizePolicyConfig = (config: PolicyConfig): PolicyConfig => ({
  ...config,
  auditLog: config.auditLog ?? [],
  keywords: mapKeywordsFromRaw((config.keywords ?? []) as RawKeyword[]),
  postPolicy: {
    ...config.postPolicy,
    postRateLimitWindowValue: config.postPolicy?.postRateLimitWindowValue ?? 1,
    postRateLimitWindowUnit: config.postPolicy?.postRateLimitWindowUnit ?? "minute",
    editRateLimitWindowValue: config.postPolicy?.editRateLimitWindowValue ?? 1,
    editRateLimitWindowUnit: config.postPolicy?.editRateLimitWindowUnit ?? "minute",
  },
  aiModeration: {
    ...DEFAULT_AI_MODERATION,
    ...(config.aiModeration ?? {}),
    detect: {
      ...DEFAULT_AI_MODERATION.detect,
      ...(config.aiModeration?.detect ?? {}),
    },
  },
});
