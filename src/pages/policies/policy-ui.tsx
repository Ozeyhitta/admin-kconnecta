import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RateLimitWindowUnit, Severity } from "./types";

export const PolicyCard = ({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) => (
  <div className={cn("rounded-lg border border-border bg-card p-5 space-y-4", className)}>
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      {description ? (
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      ) : null}
    </div>
    {children}
  </div>
);

export const SettingRow = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) => (
  <div className="flex items-center justify-between gap-4 py-2 border-b border-border/60 last:border-0">
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium">{label}</p>
      {hint ? <p className="text-xs text-muted-foreground mt-0.5">{hint}</p> : null}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

export const ToggleRow = ({
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) => (
  <SettingRow label={label} hint={hint}>
    <Switch checked={checked} onCheckedChange={onCheckedChange} />
  </SettingRow>
);

export const SeveritySelect = ({
  value,
  onChange,
}: {
  value: Severity;
  onChange: (v: Severity) => void;
}) => (
  <Select value={value} onValueChange={(v) => onChange(v as Severity)}>
    <SelectTrigger size="sm" className="w-[120px]">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="low">Thấp</SelectItem>
      <SelectItem value="medium">Trung bình</SelectItem>
      <SelectItem value="high">Cao</SelectItem>
      <SelectItem value="critical">Nghiêm trọng</SelectItem>
    </SelectContent>
  </Select>
);

export const SeverityBadge = ({ severity }: { severity: Severity }) => {
  const variant =
    severity === "critical"
      ? "destructive"
      : severity === "high"
        ? "destructive"
        : severity === "medium"
          ? "secondary"
          : "outline";
  const label =
    severity === "critical"
      ? "Nghiêm trọng"
      : severity === "high"
        ? "Cao"
        : severity === "medium"
          ? "TB"
          : "Thấp";
  return <Badge variant={variant}>{label}</Badge>;
};

export const RangeField = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) => (
  <div className="space-y-2">
    <div className="flex justify-between text-sm">
      <Label>{label}</Label>
      <span className="tabular-nums font-medium text-primary">
        {value}
        {unit ?? ""}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-2 accent-primary cursor-pointer"
    />
  </div>
);

/** Numeric policy field — allows clearing while typing without snapping to 0 (avoids "0100"). */
export const PolicyNumberInput = ({
  value,
  onChange,
  className,
  min = 0,
  onBlur,
  onFocus,
  ...props
}: Omit<ComponentProps<typeof Input>, "type" | "value" | "onChange"> & {
  value: number;
  onChange: (value: number) => void;
  min?: number;
}) => {
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDraft(String(value));
    }
  }, [value, focused]);

  const commit = () => {
    if (draft === "") {
      setDraft(String(value));
      return;
    }
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }
    const next = Math.max(min, parsed);
    onChange(next);
    setDraft(String(next));
  };

  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      className={cn(className)}
      value={draft}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === "") {
          setDraft("");
          return;
        }
        if (!/^\d+$/.test(raw)) {
          return;
        }
        setDraft(raw);
        onChange(Number(raw));
      }}
      onBlur={(e) => {
        setFocused(false);
        commit();
        onBlur?.(e);
      }}
    />
  );
};

const RATE_LIMIT_UNITS: { value: RateLimitWindowUnit; label: string }[] = [
  { value: "minute", label: "Phút" },
  { value: "hour", label: "Giờ" },
  { value: "day", label: "Ngày" },
];

export const RateLimitSettingRow = ({
  label,
  count,
  windowValue,
  windowUnit,
  onCountChange,
  onWindowValueChange,
  onWindowUnitChange,
}: {
  label: string;
  count: number;
  windowValue: number;
  windowUnit: RateLimitWindowUnit;
  onCountChange: (value: number) => void;
  onWindowValueChange: (value: number) => void;
  onWindowUnitChange: (value: RateLimitWindowUnit) => void;
}) => (
  <SettingRow label={label}>
    <div className="flex flex-wrap items-center justify-end gap-2">
      <PolicyNumberInput className="w-16 h-8" value={count} min={1} onChange={onCountChange} />
      <span className="text-xs text-muted-foreground">lần /</span>
      <PolicyNumberInput className="w-16 h-8" value={windowValue} min={1} onChange={onWindowValueChange} />
      <Select value={windowUnit} onValueChange={(v) => onWindowUnitChange(v as RateLimitWindowUnit)}>
        <SelectTrigger size="sm" className="h-8 w-[100px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RATE_LIMIT_UNITS.map(({ value, label: unitLabel }) => (
            <SelectItem key={value} value={value}>
              {unitLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  </SettingRow>
);
