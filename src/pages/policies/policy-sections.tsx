import { useMemo, useState, type FC } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Brain,
  Shield,
  Scale,

  FileText,
  Sparkles,
  History,
  Workflow,
  TrendingUp,
  Ban,
  AlertOctagon,
  AlertTriangle,
  Info,
  Eye,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { apiClient } from "@/services/axiosInstance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/common/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PolicyCard,
  RangeField,
  SettingRow,
  SeverityBadge,
  SeveritySelect,
  ToggleRow,
  WeightSlider,
} from "./policy-ui";
import { AllowedFileTypesInput } from "./AllowedFileTypesInput";
import { buildPolicyInsights } from "./insights";
import type {
  CommunityRule,
  DiffKind,
  KeywordCategory,
  KeywordEntry,
  PolicyAuditEntry,
  PolicyConfig,
  RuleCondition,
  RuleConditionField,
  RuleEngineRule,
  ViolationActionType,
  ViolationPolicyByType,
} from "./types";

type ConfigUpdater = (patch: Partial<PolicyConfig>) => void;

const KEYWORD_CATEGORY_LABEL: Record<KeywordCategory, string> = {
  blacklist: "Keyword blacklist",
  sensitive: "Keyword nhạy cảm",
  blocked_domain: "Link / domain cấm",
};

const ACTION_LABEL: Record<ViolationActionType, string> = {
  warning: "Cảnh cáo",
  lock_temp: "Khóa tạm",
  ban_permanent: "Ban vĩnh viễn",
};

const CONDITION_FIELD_LABEL: Record<RuleConditionField, string> = {
  spam_score: "Spam score",
  toxic_score: "Toxic score",
  nsfw_score: "NSFW score",
  links_per_minute: "Link / phút",
  messages_per_minute: "Tin nhắn / phút",
  keyword_match: "Keyword match",
};

// ─── 1. Community ─────────────────────────────────────────────────────────────

const SEVERITY_META: Record<string, {
  label: string;
  consequence: string;
  borderClass: string;
  badgeClass: string;
  icon: React.ReactNode;
}> = {
  critical: {
    label: "Nghiêm trọng",
    consequence: "Khóa tài khoản vĩnh viễn",
    borderClass: "border-l-red-500",
    badgeClass: "bg-red-100 text-red-700",
    icon: <Ban className="size-3.5 text-red-500" />,
  },
  high: {
    label: "Cao",
    consequence: "Tạm khóa 7–30 ngày",
    borderClass: "border-l-orange-500",
    badgeClass: "bg-orange-100 text-orange-700",
    icon: <AlertOctagon className="size-3.5 text-orange-500" />,
  },
  medium: {
    label: "Trung bình",
    consequence: "Cảnh báo + ẩn nội dung",
    borderClass: "border-l-yellow-500",
    badgeClass: "bg-yellow-100 text-yellow-700",
    icon: <AlertTriangle className="size-3.5 text-yellow-500" />,
  },
  low: {
    label: "Thấp",
    consequence: "Nhắc nhở",
    borderClass: "border-l-gray-400",
    badgeClass: "bg-gray-100 text-gray-600",
    icon: <Info className="size-3.5 text-gray-400" />,
  },
};

function getSeverityMeta(severity: string) {
  return SEVERITY_META[severity] ?? {
    label: severity,
    consequence: "Tùy mức độ",
    borderClass: "border-l-gray-300",
    badgeClass: "bg-gray-100 text-gray-500",
    icon: <Info className="size-3.5 text-gray-400" />,
  };
}

function UserPreview({ label, description }: { label: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 space-y-1">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
        <Eye className="size-3" /> Hiển thị với người dùng
      </p>
      <p className="text-sm font-semibold text-foreground">{label || "Tên vi phạm"}</p>
      {description ? (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">Ví dụ vi phạm: </span>
          {description}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground italic">Chưa có mô tả ví dụ</p>
      )}
    </div>
  );
}

function RuleEditDialog({
  rule,
  onClose,
  onSave,
}: {
  rule: CommunityRule;
  onClose: () => void;
  onSave: (r: CommunityRule) => void;
}) {
  const [draft, setDraft] = useState(rule);
  const meta = getSeverityMeta(draft.severity);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Chỉnh sửa quy tắc</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Tên vi phạm</Label>
            <Input
              value={draft.label}
              onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
              placeholder="VD: Spam, Bạo lực, Lừa đảo..."
            />
          </div>

          <div className="space-y-1.5">
            <Label>Ví dụ vi phạm</Label>
            <Textarea
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder="VD: Đăng link bán hàng vào mọi bài viết, gửi tin nhắn hàng loạt..."
              rows={3}
              className="resize-none text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Đây là nội dung người dùng thấy — viết ngắn gọn, dễ hiểu, tránh từ kỹ thuật.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-1.5">
              <Label>Mức độ</Label>
              <SeveritySelect
                value={draft.severity}
                onChange={(severity) => setDraft((d) => ({ ...d, severity }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Hình thức xử lý</Label>
              <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${meta.badgeClass}`}>
                {meta.icon}
                {meta.consequence}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Bật rule này</p>
              <p className="text-xs text-muted-foreground">Tắt để tạm ngừng áp dụng mà không xóa</p>
            </div>
            <Switch
              checked={draft.enabled}
              onCheckedChange={(enabled) => setDraft((d) => ({ ...d, enabled }))}
            />
          </div>

          <UserPreview label={draft.label} description={draft.description} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Huỷ</Button>
          <Button onClick={() => onSave(draft)}>Lưu thay đổi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const CommunitySection = ({
  config,
  update,
}: {
  config: PolicyConfig;
  update: ConfigUpdater;
}) => {
  const [editing, setEditing] = useState<CommunityRule | null>(null);

  const saveRule = (updated: CommunityRule) => {
    update({
      communityRules: config.communityRules.map((r) =>
        r.id === updated.id ? updated : r
      ),
    });
    setEditing(null);
  };

  return (
    <>
      <PolicyCard
        title="Quy tắc cộng đồng"
        description="Quản lý nội dung bị cấm — tên, ví dụ vi phạm, mức độ và hình thức xử lý hiển thị với người dùng"
      >
        {/* Legend mức độ */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 pb-2">
          {(["critical", "high", "medium", "low"] as const).map((s) => {
            const m = getSeverityMeta(s);
            return (
              <div key={s} className={`rounded-md border border-border/50 ${m.badgeClass} px-3 py-2`}>
                <div className="flex items-center gap-1 text-xs font-semibold mb-0.5">
                  {m.icon} {m.label}
                </div>
                <p className="text-xs opacity-70 leading-tight">{m.consequence}</p>
              </div>
            );
          })}
        </div>

        {/* Rule list */}
        <div className="space-y-2">
          {config.communityRules.map((rule) => {
            const meta = getSeverityMeta(rule.severity);
            return (
              <div
                key={rule.id}
                className={`flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-3 ${!rule.enabled ? "opacity-50" : ""}`}
              >
                <div className="flex-1 min-w-[160px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{rule.label}</p>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${meta.badgeClass}`}>
                      {meta.icon} {meta.label}
                    </span>
                    {!rule.enabled && (
                      <Badge variant="outline" className="text-xs">Đang tắt</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {rule.description ? `Ví dụ: ${rule.description}` : <span className="italic">Chưa có mô tả ví dụ</span>}
                  </p>
                </div>
                <Switch
                  checked={rule.enabled}
                  onCheckedChange={(enabled) =>
                    update({
                      communityRules: config.communityRules.map((r) =>
                        r.id === rule.id ? { ...r, enabled } : r
                      ),
                    })
                  }
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setEditing(rule)}
                >
                  <Pencil className="size-3.5" />
                  Sửa
                </Button>
              </div>
            );
          })}
        </div>
      </PolicyCard>

      {editing && (
        <RuleEditDialog
          rule={editing}
          onClose={() => setEditing(null)}
          onSave={saveRule}
        />
      )}
    </>
  );
};

// ─── 2. Keywords ──────────────────────────────────────────────────────────────

export const KeywordsSection = ({
  config,
  update,
}: {
  config: PolicyConfig;
  update: ConfigUpdater;
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<KeywordEntry | null>(null);
  const [form, setForm] = useState({ value: "", category: "blacklist" as KeywordCategory, note: "" });

  const openCreate = () => {
    setEditing(null);
    setForm({ value: "", category: "blacklist", note: "" });
    setDialogOpen(true);
  };

  const openEdit = (entry: KeywordEntry) => {
    setEditing(entry);
    setForm({ value: entry.value, category: entry.category, note: entry.note ?? "" });
    setDialogOpen(true);
  };

  const saveKeyword = () => {
    if (!form.value.trim()) return;
    const keywords = [...config.keywords];
    if (editing) {
      const i = keywords.findIndex((k) => k.id === editing.id);
      if (i >= 0) {
        keywords[i] = { ...editing, ...form, value: form.value.trim() };
      }
    } else {
      keywords.push({
        id: crypto.randomUUID(),
        value: form.value.trim(),
        category: form.category,
        note: form.note || undefined,
      });
    }
    update({ keywords });
    setDialogOpen(false);
  };

  const remove = (id: string) => {
    update({ keywords: config.keywords.filter((k) => k.id !== id) });
  };

  const grouped = useMemo(() => {
    const g: Record<KeywordCategory, KeywordEntry[]> = {
      blacklist: [],
      sensitive: [],
      blocked_domain: [],
    };
    for (const k of config.keywords) g[k.category].push(k);
    return g;
  }, [config.keywords]);

  return (
    <>
      <PolicyCard
        title="Từ khoá cấm"
        description="Admin thêm / sửa / xoá keyword blacklist, nhạy cảm và domain cấm"
      >
        <div className="flex justify-end">
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4 mr-1" />
            Thêm từ khóa
          </Button>
        </div>
        {(Object.keys(grouped) as KeywordCategory[]).map((cat) => (
          <div key={cat} className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {KEYWORD_CATEGORY_LABEL[cat]}
            </p>
            {grouped[cat].length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Chưa có mục nào</p>
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border">
                {grouped[cat].map((k) => (
                  <li
                    key={k.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                  >
                    <div>
                      <span className="font-medium">{k.value}</span>
                      {k.note ? (
                        <span className="text-muted-foreground ml-2 text-xs">— {k.note}</span>
                      ) : null}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(k)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive"
                        onClick={() => remove(k.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </PolicyCard>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editing ? "Sửa từ khóa" : "Thêm từ khóa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Giá trị</Label>
              <Input
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                placeholder="từ khóa hoặc domain..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Loại</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v as KeywordCategory }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(KEYWORD_CATEGORY_LABEL) as KeywordCategory[]).map((c) => (
                    <SelectItem key={c} value={c}>
                      {KEYWORD_CATEGORY_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Ghi chú</Label>
              <Input
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Huỷ
            </Button>
            <Button onClick={saveKeyword}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// ─── 3. Violations ────────────────────────────────────────────────────────────

export const ViolationsSection = ({
  config,
  update,
}: {
  config: PolicyConfig;
  update: ConfigUpdater;
}) => {
  const patchPolicy = (policy: ViolationPolicyByType) => {
    const violationPolicies = config.violationPolicies.map((p) =>
      p.id === policy.id ? policy : p
    );
    update({ violationPolicies });
  };

  return (
    <PolicyCard
      title="Chính sách xử lý vi phạm"
      description="Cấu hình theo loại vi phạm: lần 1 → cảnh cáo, lần 2 → khoá, lần 3 → ban"
    >
      {config.violationPolicies.map((policy) => (
        <div key={policy.id} className="rounded-md border border-border p-4 space-y-3">
          <p className="text-sm font-semibold">{policy.label}</p>
          {policy.steps.map((step, si) => (
            <div key={step.offense} className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="outline">Lần {step.offense}</Badge>
              <span className="text-muted-foreground">→</span>
              <Select
                value={step.action}
                onValueChange={(v) => {
                  const steps = [...policy.steps];
                  steps[si] = {
                    ...step,
                    action: v as ViolationActionType,
                    lockDays: v === "lock_temp" ? step.lockDays ?? 3 : undefined,
                  };
                  patchPolicy({ ...policy, steps });
                }}
              >
                <SelectTrigger size="sm" className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ACTION_LABEL) as ViolationActionType[]).map((a) => (
                    <SelectItem key={a} value={a}>
                      {ACTION_LABEL[a]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {step.action === "lock_temp" ? (
                <>
                  <Input
                    type="number"
                    min={1}
                    className="w-20 h-8"
                    value={step.lockDays ?? 3}
                    onChange={(e) => {
                      const steps = [...policy.steps];
                      steps[si] = { ...step, lockDays: Number(e.target.value) };
                      patchPolicy({ ...policy, steps });
                    }}
                  />
                  <span className="text-xs text-muted-foreground">ngày</span>
                </>
              ) : null}
            </div>
          ))}
        </div>
      ))}
    </PolicyCard>
  );
};

// ─── 4. AI Moderation ─────────────────────────────────────────────────────────

type PlaygroundResult = {
  flagged: boolean;
  categories: Record<string, boolean>;
  categoryScores: Record<string, number>;
};

function scoreColor(score: number) {
  if (score >= 0.5) return "bg-red-500";
  if (score >= 0.15) return "bg-amber-400";
  return "bg-emerald-500";
}

function formatCategory(key: string) {
  return key.replace("/", " / ").replace(/_/g, " ");
}

export const AiModerationSection = ({
  config,
  update,
}: {
  config: PolicyConfig;
  update: ConfigUpdater;
}) => {
  const ai = config.aiModeration;
  const setAi = (patch: Partial<typeof ai>) =>
    update({ aiModeration: { ...ai, ...patch } });

  const [playText, setPlayText] = useState("");
  const [playImageUrl, setPlayImageUrl] = useState("");
  const [playLoading, setPlayLoading] = useState(false);
  const [playResult, setPlayResult] = useState<PlaygroundResult | null>(null);
  const [playError, setPlayError] = useState<string | null>(null);

  const runTest = async () => {
    setPlayLoading(true);
    setPlayResult(null);
    setPlayError(null);
    try {
      const { data } = await apiClient.post<PlaygroundResult>("/api/v1/admin/moderation/test", {
        text: playText.trim() || null,
        imageUrl: playImageUrl.trim() || null,
      });
      setPlayResult(data);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setPlayError(msg ?? "Lỗi khi gọi API kiểm duyệt");
    } finally {
      setPlayLoading(false);
    }
  };

  return (
    <>
      <PolicyCard
        title="AI moderation"
        description="Detect toxic, spam, NSFW, hate speech, scam — cấu hình độ nhạy và hành động tự động"
      >
        <ToggleRow
          label="Bật AI kiểm duyệt"
          checked={ai.enabled}
          onCheckedChange={(enabled) => setAi({ enabled })}
        />
        <RangeField
          label="Độ nhạy AI"
          value={ai.sensitivity}
          min={0}
          max={100}
          unit="%"
          onChange={(sensitivity) => setAi({ sensitivity })}
        />
        <div className="grid sm:grid-cols-2 gap-2 pt-2">
          {(
            [
              ["toxic", "Detect toxic"],
              ["spam", "Detect spam"],
              ["nsfw", "Detect NSFW"],
              ["hateSpeech", "Detect hate speech"],
              ["scam", "Detect scam"],
            ] as const
          ).map(([key, label]) => (
            <ToggleRow
              key={key}
              label={label}
              checked={ai.detect[key]}
              onCheckedChange={(v) => setAi({ detect: { ...ai.detect, [key]: v } })}
            />
          ))}
        </div>
        <div className="border-t border-border pt-3 space-y-0">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Hành động tự động</p>
          <ToggleRow label="Auto hide bài" checked={ai.autoHidePost} onCheckedChange={(v) => setAi({ autoHidePost: v })} />
          <ToggleRow label="Auto warning" checked={ai.autoWarning} onCheckedChange={(v) => setAi({ autoWarning: v })} />
          <ToggleRow label="Auto ban" checked={ai.autoBan} onCheckedChange={(v) => setAi({ autoBan: v })} />
        </div>
      </PolicyCard>

      <PolicyCard
        title="Moderation Playground"
        description="Kiểm tra nội dung qua Google Gemini AI — nhập văn bản hoặc URL ảnh để xem kết quả phân tích"
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Nội dung văn bản</label>
            <Textarea
              className="min-h-[80px] resize-none"
              placeholder="Nhập nội dung cần kiểm tra..."
              value={playText}
              onChange={(e) => setPlayText(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">URL hình ảnh (tùy chọn)</label>
            <Input
              type="url"
              placeholder="https://example.com/image.jpg"
              value={playImageUrl}
              onChange={(e) => setPlayImageUrl(e.target.value)}
            />
          </div>
          <button
            onClick={runTest}
            disabled={playLoading || (!playText.trim() && !playImageUrl.trim())}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {playLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
            {playLoading ? "Đang kiểm tra..." : "Kiểm tra"}
          </button>

          {playError && (
            <p className="text-sm text-destructive">{playError}</p>
          )}

          {playResult && (
            <div className="rounded-md border border-border p-4 space-y-4 mt-2">
              <div className="flex items-center gap-2">
                {playResult.flagged ? (
                  <>
                    <XCircle className="w-5 h-5 text-red-500" />
                    <span className="font-semibold text-red-500">Nội dung bị gắn cờ vi phạm</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span className="font-semibold text-emerald-600">Nội dung an toàn</span>
                  </>
                )}
              </div>
              <div className="grid gap-2">
                {Object.entries(playResult.categoryScores)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, score]) => {
                    const flagged = playResult.categories[cat];
                    const pct = Math.min(score * 100, 100);
                    return (
                      <div key={cat} className="space-y-0.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className={`font-medium ${flagged ? "text-red-600" : "text-foreground"}`}>
                            {formatCategory(cat)}
                            {flagged && <span className="ml-1 text-red-500">●</span>}
                          </span>
                          <span className="text-muted-foreground tabular-nums">{(score * 100).toFixed(2)}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${scoreColor(score)}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </PolicyCard>
    </>
  );
};

// ─── 5–7 Privacy, Post, Chat ──────────────────────────────────────────────────

export const PrivacySection = ({ config, update }: { config: PolicyConfig; update: ConfigUpdater }) => {
  const p = config.privacy;
  const set = (patch: Partial<typeof p>) => update({ privacy: { ...p, ...patch } });
  return (
    <PolicyCard title="Chính sách quyền riêng tư" description="Dữ liệu user, retention, export, cookie/session">
      <p className="text-xs font-semibold text-muted-foreground">Dữ liệu user lưu trữ</p>
      <ToggleRow label="Hồ sơ & metadata" checked={p.storeProfile} onCheckedChange={(v) => set({ storeProfile: v })} />
      <ToggleRow label="Bài viết & media" checked={p.storePosts} onCheckedChange={(v) => set({ storePosts: v })} />
      <ToggleRow label="Tin nhắn chat" checked={p.storeChat} onCheckedChange={(v) => set({ storeChat: v })} />
      <ToggleRow label="Nhật ký hoạt động" checked={p.storeActivityLog} onCheckedChange={(v) => set({ storeActivityLog: v })} />
      <SettingRow label="Thời gian lưu log (ngày)">
        <Input type="number" className="w-24 h-8" value={p.logRetentionDays} onChange={(e) => set({ logRetentionDays: Number(e.target.value) })} />
      </SettingRow>
      <SettingRow label="Thời gian lưu chat (ngày)">
        <Input type="number" className="w-24 h-8" value={p.chatRetentionDays} onChange={(e) => set({ chatRetentionDays: Number(e.target.value) })} />
      </SettingRow>
      <ToggleRow label="Cho phép export dữ liệu" checked={p.allowDataExport} onCheckedChange={(v) => set({ allowDataExport: v })} />
      <ToggleRow label="Cho phép xoá tài khoản" checked={p.allowAccountDeletion} onCheckedChange={(v) => set({ allowAccountDeletion: v })} />
      <ToggleRow label="Cookie / session policy" checked={p.cookiePolicyEnabled} onCheckedChange={(v) => set({ cookiePolicyEnabled: v })} />
      <SettingRow label="Session tối đa (giờ)">
        <Input type="number" className="w-24 h-8" value={p.sessionMaxHours} onChange={(e) => set({ sessionMaxHours: Number(e.target.value) })} />
      </SettingRow>
    </PolicyCard>
  );
};

export const PostPolicySection = ({ config, update }: { config: PolicyConfig; update: ConfigUpdater }) => {
  const p = config.postPolicy;
  const set = (patch: Partial<typeof p>) => update({ postPolicy: { ...p, ...patch } });
  return (
    <PolicyCard title="Chính sách bài viết" description="Độ dài, upload, loại file, rate limit">
      <SettingRow label="Độ dài post tối đa (ký tự)">
        <Input type="number" className="w-28 h-8" value={p.maxPostLength} onChange={(e) => set({ maxPostLength: Number(e.target.value) })} />
      </SettingRow>
      <SettingRow label="Ảnh tối đa / post">
        <Input type="number" className="w-20 h-8" value={p.maxImagesPerPost} onChange={(e) => set({ maxImagesPerPost: Number(e.target.value) })} />
      </SettingRow>
      <SettingRow label="Video tối đa (MB)">
        <Input type="number" className="w-24 h-8" value={p.maxVideoMb} onChange={(e) => set({ maxVideoMb: Number(e.target.value) })} />
      </SettingRow>
      <AllowedFileTypesInput
        value={p.allowedFileTypes}
        onChange={(allowedFileTypes) => set({ allowedFileTypes })}
      />
      <SettingRow label="Rate limit đăng bài (/ phút)">
        <Input type="number" className="w-20 h-8" value={p.postsPerMinute} onChange={(e) => set({ postsPerMinute: Number(e.target.value) })} />
      </SettingRow>
      <p className="text-xs text-muted-foreground">
        Ví dụ: tối đa {p.maxImagesPerPost} ảnh/post, video &lt; {p.maxVideoMb}MB
      </p>
    </PolicyCard>
  );
};

export const ChatPolicySection = ({ config, update }: { config: PolicyConfig; update: ConfigUpdater }) => {
  const c = config.chatPolicy;
  const set = (patch: Partial<typeof c>) => update({ chatPolicy: { ...c, ...patch } });
  return (
    <PolicyCard title="Chính sách chat" description="Anti-spam, link độc, rate limit, AI scan">
      <ToggleRow label="Chống spam chat" checked={c.antiSpamEnabled} onCheckedChange={(v) => set({ antiSpamEnabled: v })} />
      <ToggleRow label="Chống gửi link độc" checked={c.blockMaliciousLinks} onCheckedChange={(v) => set({ blockMaliciousLinks: v })} />
      <SettingRow label="Giới hạn tin nhắn / phút">
        <Input type="number" className="w-20 h-8" value={c.messagesPerMinute} onChange={(e) => set({ messagesPerMinute: Number(e.target.value) })} />
      </SettingRow>
      <ToggleRow label="AI scan nội dung chat" checked={c.aiScanEnabled} onCheckedChange={(v) => set({ aiScanEnabled: v })} />
    </PolicyCard>
  );
};

// ─── 8. Recommendation ──────────────────────────────────────────────────────

export const RecommendationSection = ({
  config,
  update,
  weightTotal,
}: {
  config: PolicyConfig;
  update: ConfigUpdater;
  weightTotal: number;
}) => {
  const r = config.recommendation;
  const set = (patch: Partial<typeof r>) => update({ recommendation: { ...r, ...patch } });
  const setWeight = (key: keyof typeof r.weights, value: number) =>
    set({ weights: { ...r.weights, [key]: value } });

  return (
    <PolicyCard
      title="Chính sách thuật toán đề xuất"
      description="Ưu tiên nội dung và trọng số feed — tổng weight nên bằng 100%"
    >
      <ToggleRow label="Ưu tiên bài hot" checked={r.prioritizeHot} onCheckedChange={(v) => set({ prioritizeHot: v })} />
      <ToggleRow label="Ưu tiên bạn bè" checked={r.prioritizeFriends} onCheckedChange={(v) => set({ prioritizeFriends: v })} />
      <ToggleRow label="Ưu tiên topic quan tâm" checked={r.prioritizeTopics} onCheckedChange={(v) => set({ prioritizeTopics: v })} />
      <ToggleRow label="Giảm nội dung toxic" checked={r.reduceToxicContent} onCheckedChange={(v) => set({ reduceToxicContent: v })} />
      <div className="space-y-4 pt-2">
        <WeightSlider label="Engagement" value={r.weights.engagement} onChange={(v) => setWeight("engagement", v)} />
        <WeightSlider label="Friends" value={r.weights.friends} onChange={(v) => setWeight("friends", v)} />
        <WeightSlider label="Trending" value={r.weights.trending} onChange={(v) => setWeight("trending", v)} />
        <WeightSlider label="New content" value={r.weights.newContent} onChange={(v) => setWeight("newContent", v)} />
        <p
          className={`text-xs font-medium ${weightTotal === 100 ? "text-success" : "text-amber-600"}`}
        >
          Tổng trọng số: {weightTotal}% {weightTotal !== 100 ? "(nên chỉnh về 100%)" : ""}
        </p>
      </div>
    </PolicyCard>
  );
};

// ─── 9. Audit ─────────────────────────────────────────────────────────────────

export const AuditSection = ({ config }: { config: PolicyConfig }) => {
  const [selected, setSelected] = useState<PolicyAuditEntry | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  return (
    <>
      <PolicyCard title="Nhật ký thay đổi chính sách" description="Ai sửa, lúc nào, trường nào thay đổi">
        {config.auditLog.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có bản ghi — lưu cấu hình để tạo audit log.</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border max-h-[480px] overflow-y-auto">
            {config.auditLog.map((entry) => {
              const diffs = entry.diffs ?? [];
              return (
                <li key={entry.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{entry.adminLabel}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.changedAt).toLocaleString("vi-VN")}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="text-muted-foreground">
                        Mục: <span className="font-medium text-foreground">{entry.section}</span>
                      </span>
                      <span className="text-muted-foreground">
                        Thay đổi:{" "}
                        <span className="font-medium text-foreground">{diffs.length} trường</span>
                      </span>
                    </div>
                    <p className="text-xs italic text-muted-foreground">{entry.summary}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setSelected(entry); setShowRaw(false); }}
                  >
                    Xem chi tiết
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </PolicyCard>

      <Dialog open={!!selected} onOpenChange={() => { setSelected(null); setShowRaw(false); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Chi tiết thay đổi</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>{selected.adminLabel}</span>
                <span>{new Date(selected.changedAt).toLocaleString("vi-VN")}</span>
                <span>Mục: {selected.section}</span>
              </div>

              {(selected.diffs ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Không có thay đổi chi tiết.</p>
              ) : (
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-2 text-left font-medium">Trường</th>
                      <th className="p-2 text-left font-medium w-[28%]">Trước</th>
                      <th className="p-2 text-left font-medium w-[28%]">Sau</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(selected.diffs ?? []).map((diff, i) => (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="p-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="leading-snug">{diff.label}</span>
                            <AuditDiffBadge kind={diff.kind} />
                          </div>
                        </td>
                        <td className="p-2">
                          {diff.kind === "added" ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <span className={`text-red-600${diff.kind === "updated" ? " line-through" : ""}`}>
                              {formatDiffValue(diff.before)}
                            </span>
                          )}
                        </td>
                        <td className="p-2">
                          {diff.kind === "removed" ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <span className="font-medium text-green-600">
                              {formatDiffValue(diff.after)}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div className="border-t pt-3">
                <button
                  type="button"
                  onClick={() => setShowRaw((v) => !v)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {showRaw ? "▲ Ẩn JSON gốc" : "▼ Xem JSON gốc"}
                </button>
                {showRaw && (
                  <div className="mt-2 grid gap-2 text-xs md:grid-cols-2">
                    <div>
                      <p className="mb-1 font-semibold">Trước</p>
                      <pre className="max-h-48 overflow-auto rounded bg-muted p-2 whitespace-pre-wrap">
                        {selected.beforeJson}
                      </pre>
                    </div>
                    <div>
                      <p className="mb-1 font-semibold">Sau</p>
                      <pre className="max-h-48 overflow-auto rounded bg-muted p-2 whitespace-pre-wrap">
                        {selected.afterJson}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

function AuditDiffBadge({ kind }: { kind: DiffKind }) {
  if (kind === "added")
    return <Badge className="border-green-200 bg-green-100 text-[10px] text-green-700">Thêm</Badge>;
  if (kind === "removed")
    return <Badge className="border-red-200 bg-red-100 text-[10px] text-red-700">Xóa</Badge>;
  return <Badge className="border-amber-200 bg-amber-100 text-[10px] text-amber-700">Sửa</Badge>;
}

function formatDiffValue(val: unknown): string {
  if (val === undefined || val === null) return "—";
  if (typeof val === "boolean") return val ? "Bật" : "Tắt";
  const str = String(val);
  return str.length > 80 ? `${str.slice(0, 80)}…` : str;
}

// ─── 10. AI Insights ──────────────────────────────────────────────────────────

export const AiInsightsSection = ({ config }: { config: PolicyConfig }) => {
  const insights = useMemo(() => buildPolicyInsights(config), [config]);

  return (
    <PolicyCard title="AI Insight cho policy" description="Phân tích xu hướng vi phạm (demo / mock analytics)">
      <div className="grid gap-3 sm:grid-cols-2">
        {insights.map((ins) => (
          <div
            key={ins.id}
            className="rounded-lg border border-border p-4 space-y-2 bg-muted/30"
          >
            <div className="flex items-start justify-between gap-2">
              <Sparkles className="size-4 text-primary shrink-0 mt-0.5" />
              <SeverityBadge severity={ins.severity} />
            </div>
            <p className="text-sm font-semibold">{ins.title}</p>
            <p className="text-xs text-muted-foreground">{ins.description}</p>
            {ins.changePercent !== undefined ? (
              <Badge variant="outline" className="text-amber-700 border-amber-300">
                +{ins.changePercent}% / {ins.periodDays} ngày
              </Badge>
            ) : (
              <Badge variant="outline">{ins.periodDays} ngày</Badge>
            )}
          </div>
        ))}
      </div>
    </PolicyCard>
  );
};

// ─── Rule Engine ────────────────────────────────────────────────────────────────

export const RuleEngineSection = ({
  config,
  update,
}: {
  config: PolicyConfig;
  update: ConfigUpdater;
}) => {
  const [editing, setEditing] = useState<RuleEngineRule | null>(null);

  const saveRule = (rule: RuleEngineRule) => {
    const exists = config.ruleEngine.some((r) => r.id === rule.id);
    const ruleEngine = exists
      ? config.ruleEngine.map((r) => (r.id === rule.id ? rule : r))
      : [...config.ruleEngine, rule];
    update({ ruleEngine });
    setEditing(null);
  };

  const newRule = () => {
    setEditing({
      id: crypto.randomUUID(),
      name: "Rule mới",
      enabled: true,
      logic: "AND",
      severity: "medium",
      conditions: [
        { id: crypto.randomUUID(), field: "spam_score", operator: "gt", value: 80 },
      ],
      action: "mute",
      actionDurationMinutes: 60,
    });
  };

  return (
    <>
      <PolicyCard
        title="Rule Engine"
        description="IF điều kiện THEN hành động — ví dụ spam score &gt; 80 AND &gt; 5 link/phút → mute 1 giờ"
      >
        <div className="flex justify-end">
          <Button size="sm" onClick={newRule}>
            <Plus className="size-4 mr-1" />
            Thêm rule
          </Button>
        </div>
        <div className="space-y-3">
          {config.ruleEngine.map((rule) => (
            <div
              key={rule.id}
              className="rounded-md border border-border p-4 space-y-2 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Workflow className="size-4 text-primary" />
                  <span className="font-semibold">{rule.name}</span>
                  <Badge variant={rule.enabled ? "default" : "outline"}>
                    {rule.enabled ? "ON" : "OFF"}
                  </Badge>
                  <SeverityBadge severity={rule.severity} />
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(rule)}>
                    Sửa
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() =>
                      update({ ruleEngine: config.ruleEngine.filter((r) => r.id !== rule.id) })
                    }
                  >
                    Xoá
                  </Button>
                </div>
              </div>
              <p className="text-xs font-mono bg-muted px-2 py-1 rounded">
                IF ({rule.logic}){" "}
                {rule.conditions
                  .map(
                    (c) =>
                      `${CONDITION_FIELD_LABEL[c.field]} ${c.operator} ${c.value}`
                  )
                  .join(` ${rule.logic} `)}
                THEN {rule.action}
                {rule.actionDurationMinutes
                  ? ` (${rule.actionDurationMinutes} phút)`
                  : ""}
              </p>
            </div>
          ))}
        </div>
      </PolicyCard>

      {editing ? (
        <RuleEditorDialog
          rule={editing}
          onClose={() => setEditing(null)}
          onSave={saveRule}
        />
      ) : null}
    </>
  );
};

const RuleEditorDialog = ({
  rule,
  onClose,
  onSave,
}: {
  rule: RuleEngineRule;
  onClose: () => void;
  onSave: (r: RuleEngineRule) => void;
}) => {
  const [draft, setDraft] = useState(rule);

  const patchCondition = (id: string, patch: Partial<RuleCondition>) => {
    setDraft((d) => ({
      ...d,
      conditions: d.conditions.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Rule builder</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Tên rule</Label>
            <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
          </div>
          <ToggleRow
            label="Bật rule"
            checked={draft.enabled}
            onCheckedChange={(enabled) => setDraft((d) => ({ ...d, enabled }))}
          />
          <SettingRow label="Logic">
            <Select
              value={draft.logic}
              onValueChange={(v) => setDraft((d) => ({ ...d, logic: v as "AND" | "OR" }))}
            >
              <SelectTrigger size="sm" className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AND">AND</SelectItem>
                <SelectItem value="OR">OR</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
          <SeveritySelect
            value={draft.severity}
            onChange={(severity) => setDraft((d) => ({ ...d, severity }))}
          />
          <Label>Điều kiện (IF)</Label>
          {draft.conditions.map((c) => (
            <div key={c.id} className="flex flex-wrap gap-2 items-center">
              <Select
                value={c.field}
                onValueChange={(v) => patchCondition(c.id, { field: v as RuleConditionField })}
              >
                <SelectTrigger size="sm" className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CONDITION_FIELD_LABEL) as RuleConditionField[]).map((f) => (
                    <SelectItem key={f} value={f}>
                      {CONDITION_FIELD_LABEL[f]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={c.operator}
                onValueChange={(v) =>
                  patchCondition(c.id, { operator: v as RuleCondition["operator"] })
                }
              >
                <SelectTrigger size="sm" className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gt">&gt;</SelectItem>
                  <SelectItem value="gte">≥</SelectItem>
                  <SelectItem value="eq">=</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                className="w-20 h-8"
                value={c.value}
                onChange={(e) => patchCondition(c.id, { value: Number(e.target.value) })}
              />
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setDraft((d) => ({
                ...d,
                conditions: [
                  ...d.conditions,
                  { id: crypto.randomUUID(), field: "spam_score", operator: "gt", value: 50 },
                ],
              }))
            }
          >
            + Điều kiện
          </Button>
          <div className="space-y-1.5">
            <Label>Hành động (THEN)</Label>
            <Select
              value={draft.action}
              onValueChange={(v) => setDraft((d) => ({ ...d, action: v as RuleEngineRule["action"] }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mute">Mute</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="hide_post">Hide post</SelectItem>
                <SelectItem value="lock">Lock</SelectItem>
                <SelectItem value="ban">Ban</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {draft.action === "mute" ? (
            <SettingRow label="Thời lượng (phút)">
              <Input
                type="number"
                className="w-24 h-8"
                value={draft.actionDurationMinutes ?? 60}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, actionDurationMinutes: Number(e.target.value) }))
                }
              />
            </SettingRow>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Huỷ
          </Button>
          <Button onClick={() => onSave(draft)}>Lưu rule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const SECTION_META: {
  key: import("./types").PolicySectionKey;
  label: string;
  icon: FC<{ className?: string }>;
}[] = [
  { key: "community", label: "Cộng đồng", icon: Shield },
  { key: "keywords", label: "Từ khóa", icon: FileText },
  { key: "violations", label: "Xử phạt", icon: Scale },
  { key: "ai", label: "AI moderation", icon: Brain },
  { key: "privacy", label: "Riêng tư", icon: Shield },
  { key: "posts", label: "Bài viết", icon: FileText },

  { key: "recommendation", label: "Đề xuất", icon: TrendingUp },
  { key: "rules", label: "Rule Engine", icon: Workflow },
  { key: "insights", label: "AI Insight", icon: Sparkles },
  { key: "audit", label: "Audit log", icon: History },
];
