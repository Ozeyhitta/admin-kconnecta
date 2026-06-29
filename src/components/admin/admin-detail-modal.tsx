import * as React from "react";
import { Link } from "react-router";
import { ChevronLeft, ChevronRight, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const ADMIN_DETAIL_MODAL_CLASS =
  "w-[min(98vw,90rem)] max-w-[min(98vw,90rem)] sm:max-w-[min(98vw,90rem)] max-h-[92vh] flex flex-col gap-0 p-0 overflow-hidden";

type AdminDetailModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  loading?: boolean;
  loadingLabel?: string;
  error?: string | null;
  left: React.ReactNode;
  sidebar: React.ReactNode;
  sidebarClassName?: string;
};

export function AdminDetailModal({
  open,
  onOpenChange,
  title,
  description,
  loading,
  loadingLabel = "Đang tải chi tiết…",
  error,
  left,
  sidebar,
  sidebarClassName,
}: AdminDetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={ADMIN_DETAIL_MODAL_CLASS}>
        <DialogHeader className="px-6 pt-6 pb-4 pr-12 shrink-0 border-b bg-gradient-to-r from-background to-muted/30">
          <DialogTitle className="text-lg">{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {loadingLabel}
          </div>
        ) : error ? (
          <p className="text-sm text-destructive text-center py-20 px-6">{error}</p>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            <div className="flex-1 min-w-0 overflow-y-auto px-6 py-5 space-y-5">{left}</div>
            <div
              className={
                sidebarClassName
                ?? "lg:w-[min(30rem,36%)] xl:w-[min(34rem,38%)] shrink-0 min-h-[280px] lg:min-h-0 max-h-[42vh] lg:max-h-none"
              }
            >
              {sidebar}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

type AdminDetailSidebarProps = {
  title: string;
  subtitle?: string;
  viewAllHref?: string;
  viewAllState?: Record<string, string>;
  onViewAll?: () => void;
  viewAllLabel?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function AdminDetailSidebar({
  title,
  subtitle,
  viewAllHref,
  viewAllState,
  onViewAll,
  viewAllLabel = "Xem tất cả",
  children,
  footer,
}: AdminDetailSidebarProps) {
  return (
    <aside className="flex h-full min-h-0 flex-col border-t lg:border-t-0 lg:border-l bg-muted/20">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3 shrink-0">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
          {subtitle ? (
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{subtitle}</p>
          ) : null}
        </div>
        {viewAllHref ? (
          <Link
            to={viewAllHref}
            state={viewAllState}
            className="text-xs text-primary inline-flex items-center gap-1 hover:underline shrink-0"
            onClick={onViewAll}
          >
            {viewAllLabel}
            <ExternalLink className="size-3" />
          </Link>
        ) : null}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
      {footer ? <div className="shrink-0 border-t px-4 py-3">{footer}</div> : null}
    </aside>
  );
}

type AdminDetailSidebarPaginationProps = {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
};

export function AdminDetailSidebarPagination({
  page,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  disabled,
}: AdminDetailSidebarPaginationProps) {
  if (totalPages <= 1) return null;

  const from = page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, totalCount);
  const fmt = new Intl.NumberFormat("vi-VN");

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[11px] text-muted-foreground tabular-nums">
        Trang {page + 1} / {totalPages}
        {totalCount > 0 ? (
          <span className="text-muted-foreground/80">
            {" "}· {fmt.format(from)}–{fmt.format(to)} / {fmt.format(totalCount)}
          </span>
        ) : null}
      </p>
      <div className="flex items-center gap-1.5 self-end sm:self-auto">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          disabled={disabled || page <= 0}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-3.5" />
          Trước
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          disabled={disabled || page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
        >
          Sau
          <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

type MetricHeroCardProps = {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
};

export function MetricHeroCard({ label, value, sub, badge, actions }: MetricHeroCardProps) {
  return (
    <div className="rounded-xl border bg-gradient-to-br from-primary/5 via-background to-amber-500/5 px-5 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold tabular-nums mt-1">{value}</p>
          {sub ? <div className="text-sm text-muted-foreground mt-1">{sub}</div> : null}
          {badge ? <div className="mt-2">{badge}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">{actions}</div> : null}
      </div>
    </div>
  );
}

type MetricComparisonCardProps = {
  label: string;
  value: React.ReactNode;
  deltaPct?: number | null;
  deltaLabel?: string;
  note?: string;
};

export function MetricComparisonCard({
  label,
  value,
  deltaPct,
  deltaLabel,
  note,
}: MetricComparisonCardProps) {
  const deltaTone = deltaPct == null
    ? "text-muted-foreground"
    : deltaPct >= 0
      ? "text-emerald-600"
      : "text-red-500";

  return (
    <div className="rounded-xl border bg-card px-3.5 py-3 shadow-sm">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="text-lg font-bold tabular-nums mt-0.5">{value}</p>
      {(deltaPct != null || deltaLabel) && (
        <p className={`text-[11px] font-medium mt-1 ${deltaTone}`}>
          {deltaLabel
            ?? (deltaPct == null ? "Không đủ dữ liệu" : `${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(1)}%`)}
        </p>
      )}
      {note ? <p className="text-[10px] text-muted-foreground mt-0.5">{note}</p> : null}
    </div>
  );
}

export function InsightCard({
  title,
  children,
  tone = "amber",
}: {
  title: string;
  children: React.ReactNode;
  tone?: "amber" | "muted";
}) {
  const toneClass = tone === "amber"
    ? "border-amber-200/60 bg-amber-50/50 dark:bg-amber-950/20"
    : "bg-muted/20";

  return (
    <div className={`rounded-xl border px-4 py-3.5 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">{title}</p>
      <div className="text-sm leading-relaxed text-foreground/90">{children}</div>
    </div>
  );
}

export function SectionCard({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border bg-card p-4 shadow-sm space-y-3 ${className ?? ""}`}>
      {title ? (
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      ) : null}
      {children}
    </div>
  );
}

export function SectionIntro({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-lg border-l-4 border-l-primary bg-muted/30 px-4 py-3">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description ? (
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
      ) : null}
    </div>
  );
}
