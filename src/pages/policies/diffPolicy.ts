import type { DiffEntry, PolicyConfig } from "./types";

const SKIP_TOP_KEYS = new Set(["auditLog"]);

function flatten(val: unknown, prefix: string, out: Record<string, unknown>): void {
  if (typeof val !== "object" || val === null) {
    out[prefix] = val;
    return;
  }
  if (Array.isArray(val)) {
    const allHaveId =
      val.length > 0 &&
      val.every(
        (item) =>
          item !== null &&
          typeof item === "object" &&
          !Array.isArray(item) &&
          typeof (item as Record<string, unknown>).id === "string"
      );
    if (!allHaveId) {
      out[prefix] = JSON.stringify(val);
      return;
    }
    for (const item of val) {
      const record = item as Record<string, unknown>;
      const key = record.id as string;
      for (const [field, fieldVal] of Object.entries(record)) {
        if (field === "id") continue;
        flatten(fieldVal, `${prefix}.${key}.${field}`, out);
      }
    }
    return;
  }
  for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
    flatten(v, `${prefix}.${k}`, out);
  }
}

function flattenPolicy(config: PolicyConfig): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(config)) {
    if (SKIP_TOP_KEYS.has(k)) continue;
    flatten(v, k, out);
  }
  return out;
}

export function computePolicyDiff(before: PolicyConfig, after: PolicyConfig): DiffEntry[] {
  const fb = flattenPolicy(before);
  const fa = flattenPolicy(after);
  const keys = new Set([...Object.keys(fb), ...Object.keys(fa)]);
  const diffs: DiffEntry[] = [];

  for (const key of keys) {
    const b = fb[key];
    const a = fa[key];
    if (!(key in fb)) {
      diffs.push({ field: key, label: humanizeField(key), kind: "added", before: undefined, after: a });
    } else if (!(key in fa)) {
      diffs.push({ field: key, label: humanizeField(key), kind: "removed", before: b, after: undefined });
    } else if (b !== a) {
      diffs.push({ field: key, label: humanizeField(key), kind: "updated", before: b, after: a });
    }
  }

  return diffs.sort((x, y) => x.field.localeCompare(y.field));
}

const COMMUNITY_RULE_LABELS: Record<string, string> = {
  banned_content: "Nội dung bị cấm",
  spam: "Spam",
  toxic: "Nội dung độc hại",
  fake_news: "Tin giả",
  nsfw: "Nội dung nhạy cảm",
  scam: "Lừa đảo",
  violence: "Bạo lực",
};

const LEAF_LABELS: Record<string, string> = {
  enabled: "Kích hoạt",
  severity: "Mức độ",
  label: "Nhãn",
  description: "Mô tả",
  value: "Giá trị",
  category: "Danh mục",
  note: "Ghi chú",
  name: "Tên",
  logic: "Logic điều kiện",
  action: "Hành động",
  actionDurationMinutes: "Thời gian (phút)",
  steps: "Các bước xử phạt",
  conditions: "Điều kiện",
  field: "Trường",
  operator: "Toán tử",
};

const EXACT_LABELS: Record<string, string> = {
  "aiModeration.enabled": "AI moderation - Bật/tắt",
  "aiModeration.sensitivity": "AI moderation - Độ nhạy",
  "aiModeration.autoHidePost": "AI moderation - Tự ẩn bài vi phạm",
  "aiModeration.autoWarning": "AI moderation - Tự cảnh cáo",
  "aiModeration.autoBan": "AI moderation - Tự ban",
  "aiModeration.detect.toxic": "AI - Phát hiện nội dung độc hại",
  "aiModeration.detect.spam": "AI - Phát hiện spam",
  "aiModeration.detect.nsfw": "AI - Phát hiện NSFW",
  "aiModeration.detect.hateSpeech": "AI - Phát hiện thù địch",
  "aiModeration.detect.scam": "AI - Phát hiện lừa đảo",
  "postPolicy.maxPostLength": "Bài viết - Độ dài tối đa",
  "postPolicy.maxImagesPerPost": "Bài viết - Số ảnh tối đa",
  "postPolicy.maxVideoMb": "Bài viết - Dung lượng video (MB)",
  "postPolicy.allowedFileTypes": "Bài viết - Loại file cho phép",
  "postPolicy.postsPerMinute": "Bài viết - Giới hạn số bài",
  "postPolicy.postRateLimitWindowValue": "Bài viết - Khung thời gian đăng bài",
  "postPolicy.postRateLimitWindowUnit": "Bài viết - Đơn vị thời gian đăng bài",
  "postPolicy.editsPerMinute": "Bài viết - Giới hạn số lần sửa",
  "postPolicy.editRateLimitWindowValue": "Bài viết - Khung thời gian sửa bài",
  "postPolicy.editRateLimitWindowUnit": "Bài viết - Đơn vị thời gian sửa bài",
  "chatPolicy.antiSpamEnabled": "Chat - Chống spam",
  "chatPolicy.blockMaliciousLinks": "Chat - Chặn link độc",
  "chatPolicy.messagesPerMinute": "Chat - Giới hạn tin nhắn/phút",
  "chatPolicy.aiScanEnabled": "Chat - AI scan",
  "privacy.storeProfile": "Quyền riêng tư - Lưu hồ sơ",
  "privacy.storePosts": "Quyền riêng tư - Lưu bài viết",
  "privacy.storeChat": "Quyền riêng tư - Lưu tin nhắn",
  "privacy.storeActivityLog": "Quyền riêng tư - Lưu hoạt động",
  "privacy.logRetentionDays": "Quyền riêng tư - Lưu log (ngày)",
  "privacy.chatRetentionDays": "Quyền riêng tư - Lưu chat (ngày)",
  "privacy.allowDataExport": "Quyền riêng tư - Cho phép xuất dữ liệu",
  "privacy.allowAccountDeletion": "Quyền riêng tư - Cho phép xóa tài khoản",
  "privacy.cookiePolicyEnabled": "Quyền riêng tư - Chính sách cookie",
  "privacy.sessionMaxHours": "Quyền riêng tư - Phiên tối đa (giờ)",
  "recommendation.prioritizeHot": "Đề xuất - Ưu tiên hot",
  "recommendation.prioritizeFriends": "Đề xuất - Ưu tiên bạn bè",
  "recommendation.prioritizeTopics": "Đề xuất - Ưu tiên chủ đề",
  "recommendation.reduceToxicContent": "Đề xuất - Giảm nội dung độc hại",
  "recommendation.weights.engagement": "Đề xuất - Trọng số tương tác",
  "recommendation.weights.friends": "Đề xuất - Trọng số bạn bè",
  "recommendation.weights.trending": "Đề xuất - Trọng số xu hướng",
  "recommendation.weights.newContent": "Đề xuất - Trọng số nội dung mới",
};

export const SECTION_PREFIX_LABELS: Record<string, string> = {
  communityRules: "Nội dung trang chính sách",
  keywords: "Từ khóa",
  violationPolicies: "Xử phạt",
  aiModeration: "AI moderation",
  privacy: "Quyền riêng tư",
  postPolicy: "Bài viết",
  chatPolicy: "Chat",
  recommendation: "Đề xuất",
  ruleEngine: "Rule Engine",
};

function humanizeField(path: string): string {
  if (EXACT_LABELS[path]) return EXACT_LABELS[path];
  const parts = path.split(".");
  const section = parts[0];
  const sectionLabel = SECTION_PREFIX_LABELS[section] ?? section;

  if (section === "communityRules" && parts.length >= 2) {
    const ruleLabel = COMMUNITY_RULE_LABELS[parts[1]] ?? parts[1];
    if (parts.length >= 3) return `${ruleLabel} - ${LEAF_LABELS[parts[2]] ?? parts[2]}`;
    return ruleLabel;
  }
  if (section === "keywords" && parts.length >= 3) {
    return `Từ khóa - ${LEAF_LABELS[parts[2]] ?? parts[2]}`;
  }
  if (section === "violationPolicies" && parts.length >= 2) {
    const typeLabel = COMMUNITY_RULE_LABELS[parts[1]] ?? parts[1];
    if (parts.length >= 3) return `Xử phạt (${typeLabel}) - ${LEAF_LABELS[parts[2]] ?? parts[2]}`;
    return `Xử phạt - ${typeLabel}`;
  }
  if (section === "ruleEngine" && parts.length >= 3) {
    return `Rule Engine - ${LEAF_LABELS[parts[2]] ?? parts[2]}`;
  }

  const leafLabel = LEAF_LABELS[parts[parts.length - 1]] ?? parts[parts.length - 1];
  return parts.length > 1 ? `${sectionLabel} - ${leafLabel}` : sectionLabel;
}

export function generateSummary(diffs: DiffEntry[]): string {
  if (diffs.length === 0) return "Không có thay đổi";

  if (diffs.length === 1) {
    const d = diffs[0];
    if (d.kind === "updated") {
      if (typeof d.after === "boolean") return `${d.after ? "Bật" : "Tắt"} ${d.label}`;
      if (typeof d.before === "number" && typeof d.after === "number") {
        const dir = d.after > d.before ? "Tăng" : "Giảm";
        return `${dir} ${d.label} từ ${d.before} → ${d.after}`;
      }
      return `Cập nhật ${d.label}`;
    }
    if (d.kind === "added") return `Thêm ${d.label}`;
    return `Xóa ${d.label}`;
  }

  const added = diffs.filter((d) => d.kind === "added").length;
  const removed = diffs.filter((d) => d.kind === "removed").length;
  const updated = diffs.filter((d) => d.kind === "updated").length;
  const parts: string[] = [];
  if (updated) parts.push(`${updated} cập nhật`);
  if (added) parts.push(`${added} thêm mới`);
  if (removed) parts.push(`${removed} xóa`);
  return parts.join(", ");
}
