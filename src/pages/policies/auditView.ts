import { SECTION_PREFIX_LABELS, computePolicyDiff } from "./diffPolicy";
import type { DiffEntry, DiffKind, PolicyConfig } from "./types";

// Pure logic for the audit "Chi tiết thay đổi" modal. Recomputes the diff from
// the stored before/after JSON at display time so it works regardless of what
// the backend persisted, and exposes parsed communityRules (matched by id).

export type ChangeRow =
  | { type: "rule-added"; object: string }
  | { type: "rule-removed"; object: string }
  | { type: "field"; object: string; field: string; kind: DiffKind; before: string; after: string };

export type AuditViewState =
  | { kind: "missing-both" }
  | { kind: "missing-after" }
  | { kind: "missing-before" }
  | { kind: "identical" }
  | { kind: "unparseable" }
  | { kind: "changes"; rows: ChangeRow[] };

export interface AuditView {
  area: string;
  state: AuditViewState;
}

// Nhãn trường cho community rule — khớp với cách người dùng đọc bảng.
const COMMUNITY_FIELD_LABELS: Record<string, string> = {
  enabled: "Trạng thái",
  severity: "Mức độ",
  label: "Nhãn",
  description: "Mô tả",
};

export function formatAuditValue(val: unknown, maxLen = 200): string {
  if (val === undefined || val === null) return "—";
  if (typeof val === "boolean") return val ? "Bật" : "Tắt";
  const str = String(val);
  return str.length > maxLen ? `${str.slice(0, maxLen)}…` : str;
}

function ruleLabelById(config: PolicyConfig, id: string): string | undefined {
  const rules = (config as { communityRules?: Array<{ id: string; label?: string }> }).communityRules;
  return rules?.find((r) => r.id === id)?.label;
}

// Tách "Spam - Mức độ" → { object: "Spam", field: "Mức độ" } cho các mục không phải community.
function splitLabel(label: string): { object: string; field: string } {
  const idx = label.indexOf(" - ");
  if (idx === -1) return { object: label, field: "—" };
  return { object: label.slice(0, idx), field: label.slice(idx + 3) };
}

function mapFallbackArea(section: string): string {
  return section === "Chính sách" ? "Chính sách cộng đồng" : section;
}

function deriveArea(diffs: DiffEntry[], fallbackSection: string): string {
  if (diffs.some((d) => d.field.startsWith("communityRules"))) return "Chính sách cộng đồng";
  const tops = new Set(diffs.map((d) => d.field.split(".")[0]));
  if (tops.size === 1) {
    const top = [...tops][0];
    return SECTION_PREFIX_LABELS[top] ?? mapFallbackArea(fallbackSection);
  }
  return mapFallbackArea(fallbackSection);
}

function buildRows(diffs: DiffEntry[], before: PolicyConfig, after: PolicyConfig): ChangeRow[] {
  const rows: ChangeRow[] = [];

  // ── Community rules: gom theo id, không so sánh theo index ──
  const byRuleId = new Map<string, DiffEntry[]>();
  const others: DiffEntry[] = [];
  for (const d of diffs) {
    if (d.field.startsWith("communityRules.")) {
      const id = d.field.split(".")[1];
      const group = byRuleId.get(id) ?? [];
      group.push(d);
      byRuleId.set(id, group);
    } else {
      others.push(d);
    }
  }

  for (const [id, group] of byRuleId) {
    const labelAfter = ruleLabelById(after, id);
    const labelBefore = ruleLabelById(before, id);
    const objectFallback = splitLabel(group[0].label).object;

    if (group.every((d) => d.kind === "added")) {
      rows.push({ type: "rule-added", object: labelAfter ?? objectFallback ?? id });
    } else if (group.every((d) => d.kind === "removed")) {
      rows.push({ type: "rule-removed", object: labelBefore ?? objectFallback ?? id });
    } else {
      const object = labelAfter ?? labelBefore ?? objectFallback ?? id;
      for (const d of group) {
        const leaf = d.field.split(".")[2] ?? "";
        rows.push({
          type: "field",
          object,
          field: COMMUNITY_FIELD_LABELS[leaf] ?? leaf,
          kind: d.kind,
          before: formatAuditValue(d.before),
          after: formatAuditValue(d.after),
        });
      }
    }
  }

  for (const d of others) {
    const { object, field } = splitLabel(d.label);
    rows.push({
      type: "field",
      object,
      field,
      kind: d.kind,
      before: formatAuditValue(d.before),
      after: formatAuditValue(d.after),
    });
  }

  return rows;
}

export function buildAuditView(
  beforeJson: string | undefined,
  afterJson: string | undefined,
  fallbackSection: string,
): AuditView {
  const hasBefore = !!beforeJson && beforeJson.trim().length > 0;
  const hasAfter = !!afterJson && afterJson.trim().length > 0;
  const fallbackArea = mapFallbackArea(fallbackSection);

  if (!hasBefore && !hasAfter) return { area: fallbackArea, state: { kind: "missing-both" } };
  if (hasBefore && !hasAfter) return { area: fallbackArea, state: { kind: "missing-after" } };
  if (!hasBefore && hasAfter) return { area: fallbackArea, state: { kind: "missing-before" } };

  // Cả hai cùng tồn tại.
  if (beforeJson === afterJson) return { area: fallbackArea, state: { kind: "identical" } };

  let before: PolicyConfig;
  let after: PolicyConfig;
  try {
    before = JSON.parse(beforeJson as string);
    after = JSON.parse(afterJson as string);
  } catch {
    return { area: fallbackArea, state: { kind: "unparseable" } };
  }

  const diffs = computePolicyDiff(before, after);
  if (diffs.length === 0) return { area: fallbackArea, state: { kind: "unparseable" } };

  const rows = buildRows(diffs, before, after);
  if (rows.length === 0) return { area: fallbackArea, state: { kind: "unparseable" } };

  return { area: deriveArea(diffs, fallbackSection), state: { kind: "changes", rows } };
}
