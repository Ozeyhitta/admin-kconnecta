import { useCallback, useMemo, useState, type KeyboardEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Film,
  Image as ImageIcon,
  Info,
  Plus,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  FILE_TYPE_PRESETS,
  getCategoryLabel,
  getPresetCategory,
  normalizeExtension,
  parseAllowedFileTypes,
  presetsByCategory,
  serializeAllowedFileTypes,
  validateAllowedFileTypes,
  type FileTypeCategory,
} from "./allowedFileTypesUtils";

const CATEGORY_META: Record<
  FileTypeCategory,
  { icon: typeof ImageIcon; chipClass: string; badgeClass: string }
> = {
  images: {
    icon: ImageIcon,
    chipClass:
      "border-blue-200/80 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20",
    badgeClass:
      "border-blue-200/80 bg-blue-50 text-blue-800 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-200",
  },
  videos: {
    icon: Film,
    chipClass:
      "border-violet-200/80 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300 dark:hover:bg-violet-500/20",
    badgeClass:
      "border-violet-200/80 bg-violet-50 text-violet-800 dark:border-violet-500/40 dark:bg-violet-500/15 dark:text-violet-200",
  },
  documents: {
    icon: FileText,
    chipClass:
      "border-slate-200/80 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-300 dark:hover:bg-slate-500/20",
    badgeClass:
      "border-slate-200/80 bg-slate-50 text-slate-800 dark:border-slate-500/40 dark:bg-slate-500/15 dark:text-slate-200",
  },
};

const CUSTOM_BADGE =
  "border-amber-200/80 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200";

type AllowedFileTypesInputProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function AllowedFileTypesInput({
  value,
  onChange,
  className,
}: AllowedFileTypesInputProps) {
  const [draft, setDraft] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);

  const selected = useMemo(() => parseAllowedFileTypes(value), [value]);
  const validation = useMemo(() => validateAllowedFileTypes(selected), [selected]);

  const commit = useCallback(
    (next: string[]) => {
      onChange(serializeAllowedFileTypes(next));
    },
    [onChange]
  );

  const addExtension = useCallback(
    (raw: string) => {
      const ext = normalizeExtension(raw);
      if (!ext) {
        setInputError("Nhập phần mở rộng file (vd: png, mp4).");
        return;
      }
      if (!/^[a-z0-9]{1,10}$/.test(ext)) {
        setInputError("Chỉ cho phép chữ thường và số, tối đa 10 ký tự.");
        return;
      }
      if (selected.includes(ext)) {
        setInputError(`".${ext}" đã có trong danh sách.`);
        return;
      }
      setInputError(null);
      commit([...selected, ext]);
      setDraft("");
    },
    [commit, selected]
  );

  const removeExtension = (ext: string) => {
    commit(selected.filter((e) => e !== ext));
    setInputError(null);
  };

  const togglePreset = (ext: string) => {
    if (selected.includes(ext)) {
      removeExtension(ext);
    } else {
      addExtension(ext);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addExtension(draft);
    }
    if (e.key === "Backspace" && !draft && selected.length > 0) {
      removeExtension(selected[selected.length - 1]);
    }
  };

  const statusIcon =
    validation.tone === "success" ? (
      <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
    ) : validation.tone === "error" ? (
      <AlertCircle className="size-3.5 shrink-0 text-destructive" />
    ) : (
      <Info className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
    );

  return (
    <div
      className={cn(
        "rounded-xl border border-border/80 bg-card shadow-sm",
        "ring-1 ring-black/[0.02] dark:ring-white/[0.04]",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 border-b border-border/60 px-4 py-3.5 sm:px-5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-sm">
          <Upload className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold tracking-tight text-foreground">
            Allowed File Types
          </h4>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Định dạng được phép khi người dùng upload bài viết. Nhấn chip để bật/tắt hoặc gõ
            extension rồi Enter.
          </p>
        </div>
        <Badge
          variant="outline"
          className="shrink-0 tabular-nums border-primary/25 bg-primary/5 text-primary"
        >
          {selected.length} active
        </Badge>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {/* Selected tags */}
        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Selected formats
          </p>
          <div
            className={cn(
              "min-h-[44px] rounded-lg border border-dashed border-border/80 bg-muted/30 px-3 py-2.5",
              "transition-colors focus-within:border-primary/40 focus-within:bg-primary/[0.02]"
            )}
          >
            {selected.length === 0 ? (
              <p className="text-xs text-muted-foreground py-1">
                Chưa chọn định dạng — thêm từ nhóm bên dưới hoặc nhập thủ công.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {selected.map((ext) => {
                  const cat = getPresetCategory(ext);
                  const badgeClass =
                    cat === "custom"
                      ? CUSTOM_BADGE
                      : CATEGORY_META[cat as FileTypeCategory].badgeClass;
                  return (
                    <span
                      key={ext}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium",
                        badgeClass
                      )}
                    >
                      <span className="opacity-60">.</span>
                      {ext}
                      <button
                        type="button"
                        onClick={() => removeExtension(ext)}
                        className="rounded p-0.5 opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10"
                        aria-label={`Remove .${ext}`}
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Multi tag input */}
        <div className="space-y-1.5">
          <label
            htmlFor="allowed-file-type-input"
            className="text-xs font-medium text-foreground"
          >
            Add custom extension
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                .
              </span>
              <Input
                id="allowed-file-type-input"
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value.replace(/[^a-zA-Z0-9]/g, ""));
                  setInputError(null);
                }}
                onKeyDown={handleKeyDown}
                placeholder="webp, mp4, pdf…"
                className={cn(
                  "h-9 pl-6 pr-3 text-sm shadow-xs",
                  inputError && "border-destructive/60 focus-visible:ring-destructive/30"
                )}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <button
              type="button"
              onClick={() => addExtension(draft)}
              disabled={!draft.trim()}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm font-medium",
                "bg-primary text-primary-foreground shadow-sm",
                "hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
              )}
            >
              <Plus className="size-4" />
              Add
            </button>
          </div>
          {inputError ? (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="size-3 shrink-0" />
              {inputError}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Enter hoặc dấu phẩy để thêm · Backspace xóa tag cuối
            </p>
          )}
        </div>

        {/* Grouped preset chips */}
        {(["images", "videos", "documents"] as FileTypeCategory[]).map((category) => {
          const Icon = CATEGORY_META[category].icon;
          const presets = presetsByCategory(category);
          return (
            <div key={category} className="space-y-2">
              <div className="flex items-center gap-2">
                <Icon className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-foreground">
                  {getCategoryLabel(category)}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {presets.filter((p) => selected.includes(p.ext)).length}/{presets.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((preset) => {
                  const active = selected.includes(preset.ext);
                  return (
                    <button
                      key={preset.ext}
                      type="button"
                      onClick={() => togglePreset(preset.ext)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-all",
                        "shadow-xs",
                        active
                          ? "border-primary/50 bg-primary text-primary-foreground ring-2 ring-primary/20"
                          : CATEGORY_META[category].chipClass
                      )}
                    >
                      {active ? (
                        <CheckCircle2 className="size-3 opacity-90" />
                      ) : (
                        <Plus className="size-3 opacity-50" />
                      )}
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Validation footer */}
        <div
          className={cn(
            "flex items-start gap-2 rounded-lg border px-3 py-2 text-xs",
            validation.tone === "success" &&
              "border-emerald-200/80 bg-emerald-50/80 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200",
            validation.tone === "warning" &&
              "border-amber-200/80 bg-amber-50/80 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100",
            validation.tone === "error" &&
              "border-destructive/30 bg-destructive/5 text-destructive",
            validation.tone === "neutral" && "border-border bg-muted/40 text-muted-foreground"
          )}
        >
          {statusIcon}
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="font-medium leading-snug">{validation.message}</p>
            {selected.length > 0 ? (
              <p className="text-[11px] opacity-80 font-mono truncate" title={value}>
                API: {serializeAllowedFileTypes(selected)}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
