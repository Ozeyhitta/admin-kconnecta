import { useMemo, useState, type FC } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Brain,
  Shield,
  Scale,

  FileText,
  History,
  TrendingUp,
  Ban,
  AlertOctagon,
  AlertTriangle,
  Info,
  Eye,
  Loader2,
  CheckCircle2,
  XCircle,
  Lock,
  Database,
  Clock,
  UserCheck,
  Cookie,
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
  PolicyNumberInput,
  RangeField,
  SettingRow,
  SeverityBadge,
  SeveritySelect,
  ToggleRow,
  WeightSlider,
} from "./policy-ui";
import { AllowedFileTypesInput } from "./AllowedFileTypesInput";
import type {
  CommunityRule,
  DiffKind,
  KeywordCategory,
  KeywordEntry,
  PolicyAuditEntry,
  PolicyConfig,
  ViolationActionType,
  ViolationPolicyByType,
} from "./types";
import { DEFAULT_AI_MODERATION } from "./defaults";
import { buildAuditView, type ChangeRow } from "./auditView";

type ConfigUpdater = (patch: Partial<PolicyConfig>) => void;

const KEYWORD_CATEGORY_LABEL: Record<KeywordCategory, string> = {
  blacklist: "Keyword blacklist",
  watchlist: "Keyword watchlist (vùng xám)",
  blocked_domain: "Link / domain cấm",
};

const ACTION_LABEL: Record<ViolationActionType, string> = {
  warning: "Cảnh cáo",
  lock_temp: "Khóa tạm",
  ban_permanent: "Ban vĩnh viễn",
};

// ─── 1. Community rules (policy metadata) ────────────────────────────────────

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
              <p className="text-sm font-medium">Hiển thị trên trang user</p>
              <p className="text-xs text-muted-foreground">
                Tắt để loại khỏi API public — không ảnh hưởng kiểm duyệt tự động
              </p>
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
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
        <Info className="size-4 mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="font-medium">Metadata quy tắc — không phải kiểm duyệt</p>
          <p className="text-xs leading-relaxed opacity-90 mt-1">
            Lưu định nghĩa loại vi phạm (tên, ví dụ, mức độ) trong cấu hình hệ thống.
            Kiểm duyệt thực tế nằm ở tab{" "}
            <span className="font-medium">Từ khóa</span> và{" "}
            <span className="font-medium">AI moderation</span>.
          </p>
        </div>
      </div>

      <PolicyCard
        title="Quy tắc cộng đồng"
        description="Định nghĩa loại vi phạm — tên, ví dụ, mức độ và hình thức xử lý (metadata)"
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
      watchlist: [],
      blocked_domain: [],
    };
    for (const k of config.keywords) g[k.category].push(k);
    return g;
  }, [config.keywords]);

  return (
    <>
      <PolicyCard
        title="Từ khoá cấm"
        description="Admin thêm / sửa / xoá keyword blacklist, watchlist và domain cấm — đồng bộ sang User app qua API"
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
                  <PolicyNumberInput
                    min={1}
                    className="w-20 h-8"
                    value={step.lockDays ?? 3}
                    onChange={(lockDays) => {
                      const steps = [...policy.steps];
                      steps[si] = { ...step, lockDays };
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

// ─── Thanh độ nhạy AI (read-only) ───────────────────────────────────────────
// Minh họa giá trị "Độ nhạy AI" theo 4 mục kèm chú thích từng mục. Chỉ hiển thị —
// admin vẫn chỉnh giá trị bằng slider RangeField ở trên.
type SensitivityLevel = {
  max: number; // ngưỡng trên (bao gồm)
  label: string;
  note: string;
  barClass: string;
  dotClass: string;
  activeClass: string;
};

const SENSITIVITY_LEVELS: SensitivityLevel[] = [
  {
    max: 25,
    label: "Thoáng",
    note: "Chỉ chặn vi phạm rõ ràng, hiếm khi báo nhầm.",
    barClass: "bg-emerald-500",
    dotClass: "bg-emerald-500",
    activeClass:
      "border-emerald-300 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10",
  },
  {
    max: 50,
    label: "Cân bằng",
    note: "Cân bằng giữa độ chính xác và độ phủ (khuyến nghị).",
    barClass: "bg-blue-500",
    dotClass: "bg-blue-500",
    activeClass: "border-blue-300 bg-blue-50 dark:border-blue-500/40 dark:bg-blue-500/10",
  },
  {
    max: 75,
    label: "Nghiêm",
    note: "Bắt nhiều hơn, có thể báo nhầm (false positive).",
    barClass: "bg-orange-500",
    dotClass: "bg-orange-500",
    activeClass: "border-orange-300 bg-orange-50 dark:border-orange-500/40 dark:bg-orange-500/10",
  },
  {
    max: 100,
    label: "Rất nghiêm",
    note: "Cực gắt, nhiều báo nhầm — chỉ dùng khi cần siết mạnh.",
    barClass: "bg-red-500",
    dotClass: "bg-red-500",
    activeClass: "border-red-300 bg-red-50 dark:border-red-500/40 dark:bg-red-500/10",
  },
];

const SensitivityScale: FC<{ value: number }> = ({ value }) => {
  const v = Math.max(0, Math.min(100, value));
  const activeIdx = SENSITIVITY_LEVELS.findIndex((l) => v <= l.max);

  return (
    <div className="space-y-3 pt-1">
      {/* Thanh 4 mục + con trỏ giá trị hiện tại */}
      <div className="relative pt-5">
        <div
          className="absolute top-0 -translate-x-1/2 transition-all duration-200"
          style={{ left: `${v}%` }}
        >
          <div className="flex flex-col items-center leading-none">
            <span className="text-[10px] font-semibold tabular-nums text-foreground">{v}%</span>
            <span className="-mt-0.5 text-foreground">▼</span>
          </div>
        </div>
        <div className="flex h-2 w-full overflow-hidden rounded-full">
          {SENSITIVITY_LEVELS.map((l, i) => (
            <div
              key={l.label}
              className={`h-full ${l.barClass} ${i === activeIdx ? "opacity-100" : "opacity-30"}`}
              style={{ width: `${l.max - (SENSITIVITY_LEVELS[i - 1]?.max ?? 0)}%` }}
            />
          ))}
        </div>
      </div>

      {/* Chú thích từng mục */}
      <div className="grid gap-1.5 sm:grid-cols-2">
        {SENSITIVITY_LEVELS.map((l, i) => {
          const active = i === activeIdx;
          const lower = (SENSITIVITY_LEVELS[i - 1]?.max ?? -1) + 1;
          return (
            <div
              key={l.label}
              className={`rounded-md border px-2.5 py-1.5 transition-colors ${
                active ? l.activeClass : "border-border opacity-70"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`size-2 shrink-0 rounded-full ${l.dotClass}`} />
                <span className="text-xs font-semibold">{l.label}</span>
                {active && (
                  <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground">
                    Đang chọn
                  </span>
                )}
                <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
                  {lower}–{l.max}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{l.note}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const AiModerationSection = ({
  config,
  update,
}: {
  config: PolicyConfig;
  update: ConfigUpdater;
}) => {
  const ai = config.aiModeration ?? DEFAULT_AI_MODERATION;
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
        <SensitivityScale value={ai.sensitivity} />
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

// Trang mô tả chính sách quyền riêng tư — chỉ đọc (read-only).
// Không còn toggle/input cấu hình; nội dung chỉ nhằm minh bạch cách hệ thống
// xử lý dữ liệu. Dữ liệu privacy vẫn nằm trong PolicyConfig và do User app sử
// dụng — phần này không chỉnh sửa nó.
const PRIVACY_POLICY_SECTIONS: { icon: typeof Lock; title: string; body: string }[] = [
  {
    icon: Database,
    title: "Dữ liệu người dùng được lưu trữ",
    body: "Hệ thống có thể lưu trữ một số loại dữ liệu cần thiết để vận hành dịch vụ, bao gồm thông tin hồ sơ, metadata tài khoản, bài viết, media tải lên, tin nhắn chat và nhật ký hoạt động.",
  },
  {
    icon: Clock,
    title: "Thời gian lưu dữ liệu",
    body: "Nhật ký hoạt động có thể được lưu trong một khoảng thời gian nhất định để phục vụ kiểm tra bảo mật, xử lý lỗi và quản trị hệ thống. Tin nhắn chat có thể được lưu tạm thời nhằm hỗ trợ trải nghiệm người dùng và xử lý khiếu nại nếu có.",
  },
  {
    icon: UserCheck,
    title: "Quyền của người dùng",
    body: "Người dùng có quyền yêu cầu xem, xuất hoặc xoá dữ liệu cá nhân theo chính sách của hệ thống. Một số yêu cầu có thể cần được quản trị viên xác nhận trước khi xử lý.",
  },
  {
    icon: Cookie,
    title: "Cookie và phiên đăng nhập",
    body: "Hệ thống có thể sử dụng cookie hoặc session để duy trì trạng thái đăng nhập, bảo mật tài khoản và cải thiện trải nghiệm sử dụng. Phiên đăng nhập có thể hết hạn sau một khoảng thời gian nhất định để đảm bảo an toàn.",
  },
];

export const PrivacySection = () => (
  <div className="space-y-4">
    {/* Tiêu đề + mô tả ngắn */}
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
          <Lock className="size-5 text-primary" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-semibold">Chính sách quyền riêng tư</h2>
          <p className="text-sm text-muted-foreground">
            Trang này mô tả cách hệ thống thu thập, lưu trữ và xử lý dữ liệu người dùng. Các thông
            tin này chỉ nhằm mục đích minh bạch chính sách, không phải khu vực cấu hình tự động.
          </p>
        </div>
      </div>
    </div>

    {/* Ghi chú chỉ đọc */}
    <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
      <Info className="size-4 mt-0.5 shrink-0" />
      <span>
        Đây là trang chỉ đọc — nội dung mang tính mô tả, không thể chỉnh sửa trực tiếp trong trang
        quản trị.
      </span>
    </div>

    {/* Các section mô tả */}
    {PRIVACY_POLICY_SECTIONS.map(({ icon: Icon, title, body }, i) => (
      <div key={title} className="rounded-lg border border-border bg-card p-5">
        <div className="mb-2 flex items-center gap-2.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Icon className="size-4" />
          </div>
          <h3 className="text-sm font-semibold">
            {i + 1}. {title}
          </h3>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
      </div>
    ))}
  </div>
);

export const PostPolicySection = ({ config, update }: { config: PolicyConfig; update: ConfigUpdater }) => {
  const p = config.postPolicy;
  const set = (patch: Partial<typeof p>) => update({ postPolicy: { ...p, ...patch } });
  return (
    <PolicyCard title="Chính sách bài viết" description="Độ dài, upload, loại file, rate limit">
      <SettingRow label="Độ dài post tối đa (ký tự)">
        <PolicyNumberInput className="w-28 h-8" value={p.maxPostLength} onChange={(maxPostLength) => set({ maxPostLength })} />
      </SettingRow>
      <SettingRow label="Ảnh tối đa / post">
        <PolicyNumberInput className="w-20 h-8" value={p.maxImagesPerPost} onChange={(maxImagesPerPost) => set({ maxImagesPerPost })} />
      </SettingRow>
      <SettingRow label="Video tối đa (MB)">
        <PolicyNumberInput className="w-24 h-8" value={p.maxVideoMb} onChange={(maxVideoMb) => set({ maxVideoMb })} />
      </SettingRow>
      <AllowedFileTypesInput
        value={p.allowedFileTypes}
        onChange={(allowedFileTypes) => set({ allowedFileTypes })}
      />
      <SettingRow label="Rate limit đăng bài (/ phút)">
        <PolicyNumberInput className="w-20 h-8" value={p.postsPerMinute} onChange={(postsPerMinute) => set({ postsPerMinute })} />
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
        <PolicyNumberInput className="w-20 h-8" value={c.messagesPerMinute} onChange={(messagesPerMinute) => set({ messagesPerMinute })} />
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
      <ToggleRow
        label="Ưu tiên bài hot"
        hint="Đẩy bài có nhiều lượt thích, bình luận, chia sẻ lên đầu feed."
        checked={r.prioritizeHot}
        onCheckedChange={(v) => set({ prioritizeHot: v })}
      />
      <ToggleRow
        label="Ưu tiên bạn bè"
        hint="Đẩy bài của bạn bè và người mà người dùng hay tương tác lên trước."
        checked={r.prioritizeFriends}
        onCheckedChange={(v) => set({ prioritizeFriends: v })}
      />
      <ToggleRow
        label="Ưu tiên topic quan tâm"
        hint="(Chưa áp dụng) Sẽ ưu tiên chủ đề người dùng quan tâm — cần dữ liệu chủ đề."
        checked={r.prioritizeTopics}
        onCheckedChange={(v) => set({ prioritizeTopics: v })}
      />
      <ToggleRow
        label="Giảm nội dung toxic"
        hint="(Chưa áp dụng) Sẽ hạ thứ hạng bài có nội dung độc hại — cần điểm toxic."
        checked={r.reduceToxicContent}
        onCheckedChange={(v) => set({ reduceToxicContent: v })}
      />
      <div className="space-y-4 pt-2">
        <WeightSlider
          label="Engagement"
          hint="Mức ưu tiên bài có nhiều tương tác (thích, bình luận, chia sẻ)."
          value={r.weights.engagement}
          onChange={(v) => setWeight("engagement", v)}
        />
        <WeightSlider
          label="Friends"
          hint="Mức ưu tiên bài của bạn bè / người dùng hay tương tác cùng."
          value={r.weights.friends}
          onChange={(v) => setWeight("friends", v)}
        />
        <WeightSlider
          label="Trending"
          hint="Bài đang được quan tâm nhiều — tính gộp chung với nhóm tương tác."
          value={r.weights.trending}
          onChange={(v) => setWeight("trending", v)}
        />
        <WeightSlider
          label="New content"
          hint="Mức ưu tiên bài mới đăng gần đây (độ mới)."
          value={r.weights.newContent}
          onChange={(v) => setWeight("newContent", v)}
        />
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
          <ul className="divide-y divide-border rounded-md border border-border max-h-[min(60vh,560px)] overflow-y-auto">
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
                        Khu vực:{" "}
                        <span className="font-medium text-foreground">
                          {entry.section === "Chính sách" ? "Chính sách cộng đồng" : entry.section}
                        </span>
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
        <DialogContent
          className="flex h-[min(92vh,900px)] w-[min(96vw,72rem)] max-w-[min(96vw,72rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(96vw,72rem)]"
          aria-describedby={undefined}
        >
          <DialogHeader className="shrink-0 border-b px-6 py-4">
            <DialogTitle>Chi tiết thay đổi</DialogTitle>
          </DialogHeader>
          {selected && (
            <AuditDetail
              entry={selected}
              showRaw={showRaw}
              onToggleRaw={() => setShowRaw((v) => !v)}
            />
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

function AuditStateMessage({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 px-4 py-6 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {desc ? <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">{desc}</p> : null}
    </div>
  );
}

function AuditChangesTable({ rows }: { rows: ChangeRow[] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="p-3 text-left font-medium w-[22%]">Đối tượng</th>
            <th className="p-3 text-left font-medium w-[18%]">Trường</th>
            <th className="p-3 text-left font-medium w-[30%]">Trước</th>
            <th className="p-3 text-left font-medium w-[30%]">Sau</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row, i) => {
            if (row.type === "rule-added") {
              return (
                <tr key={i} className="bg-green-50/60 dark:bg-green-500/10">
                  <td colSpan={4} className="p-3">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <AuditDiffBadge kind="added" />
                      <span className="font-medium text-green-700 dark:text-green-400">
                        Đã thêm chính sách: {row.object}
                      </span>
                    </span>
                  </td>
                </tr>
              );
            }
            if (row.type === "rule-removed") {
              return (
                <tr key={i} className="bg-red-50/60 dark:bg-red-500/10">
                  <td colSpan={4} className="p-3">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <AuditDiffBadge kind="removed" />
                      <span className="font-medium text-red-700 dark:text-red-400">
                        Đã xóa chính sách: {row.object}
                      </span>
                    </span>
                  </td>
                </tr>
              );
            }
            return (
              <tr key={i} className="align-top hover:bg-muted/30">
                <td className="p-3 font-medium">{row.object}</td>
                <td className="p-3">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="leading-snug">{row.field}</span>
                    <AuditDiffBadge kind={row.kind} />
                  </span>
                </td>
                <td className="p-3 break-words">
                  {row.kind === "added" ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <span className={`text-red-600${row.kind === "updated" ? " line-through" : ""}`}>
                      {row.before}
                    </span>
                  )}
                </td>
                <td className="p-3 break-words">
                  {row.kind === "removed" ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <span className="font-medium text-green-600">{row.after}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AuditDetail({
  entry,
  showRaw,
  onToggleRaw,
}: {
  entry: PolicyAuditEntry;
  showRaw: boolean;
  onToggleRaw: () => void;
}) {
  const view = useMemo(
    () => buildAuditView(entry.beforeJson, entry.afterJson, entry.section),
    [entry],
  );
  const hasBefore = !!entry.beforeJson && entry.beforeJson.trim().length > 0;
  const hasAfter = !!entry.afterJson && entry.afterJson.trim().length > 0;
  const { state } = view;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
      {/* Ai · lúc nào · khu vực nào */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <span className="text-muted-foreground">
          Người thực hiện: <span className="font-medium text-foreground">{entry.adminLabel}</span>
        </span>
        <span className="text-muted-foreground">
          Thời gian:{" "}
          <span className="font-medium text-foreground">
            {new Date(entry.changedAt).toLocaleString("vi-VN")}
          </span>
        </span>
        <span className="text-muted-foreground">
          Khu vực: <span className="font-medium text-foreground">{view.area}</span>
        </span>
      </div>

      {/* Tóm tắt thay đổi — ưu tiên trước JSON */}
      {state.kind === "changes" ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Thay đổi phát hiện được</p>
          <AuditChangesTable rows={state.rows} />
        </div>
      ) : state.kind === "identical" ? (
        <AuditStateMessage
          title="Không có thay đổi nào được phát hiện."
          desc="Dữ liệu trước và sau giống nhau. Có thể người dùng đã bấm lưu mà không chỉnh sửa nội dung."
        />
      ) : state.kind === "unparseable" ? (
        <AuditStateMessage
          title="Chưa thể phân tích chi tiết thay đổi."
          desc="Hệ thống đã lưu dữ liệu trước và sau, nhưng chưa xác định được trường nào thay đổi. Bạn có thể kiểm tra dữ liệu kỹ thuật bên dưới."
        />
      ) : state.kind === "missing-after" ? (
        <AuditStateMessage title="Thiếu dữ liệu sau khi thay đổi." />
      ) : state.kind === "missing-before" ? (
        <AuditStateMessage title="Thiếu dữ liệu trước khi thay đổi." />
      ) : (
        <AuditStateMessage title="Không có dữ liệu thay đổi." />
      )}

      {/* JSON kỹ thuật — đóng mặc định, chỉ để debug */}
      {(hasBefore || hasAfter) && (
        <div className="flex min-h-0 flex-1 flex-col border-t pt-3">
          <button
            type="button"
            onClick={onToggleRaw}
            className="shrink-0 self-start text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {showRaw ? "▲ Ẩn dữ liệu kỹ thuật" : "▼ Xem dữ liệu kỹ thuật"}
          </button>
          {showRaw && (
            <div className="mt-3 grid min-h-0 flex-1 gap-3 text-xs lg:grid-cols-2">
              <div className="flex min-h-[min(42vh,360px)] flex-col">
                <p className="mb-1.5 shrink-0 font-semibold">Dữ liệu trước khi thay đổi</p>
                <pre className="min-h-0 flex-1 overflow-auto rounded-md border bg-muted/60 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                  {entry.beforeJson || "—"}
                </pre>
              </div>
              <div className="flex min-h-[min(42vh,360px)] flex-col">
                <p className="mb-1.5 shrink-0 font-semibold">Dữ liệu sau khi thay đổi</p>
                <pre className="min-h-0 flex-1 overflow-auto rounded-md border bg-muted/60 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                  {entry.afterJson || "—"}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const SECTION_META: {
  key: import("./types").PolicySectionKey;
  label: string;
  title?: string;
  icon: FC<{ className?: string }>;
}[] = [
  { key: "keywords", label: "Từ khóa", icon: FileText },
  { key: "violations", label: "Xử phạt", icon: Scale },
  { key: "ai", label: "AI moderation", icon: Brain },
  { key: "posts", label: "Bài viết", icon: FileText },

  { key: "recommendation", label: "Đề xuất", icon: TrendingUp },
  { key: "audit", label: "Audit log", icon: History },
];
