import * as React from "react";
import { Link } from "react-router";
import { ExternalLink } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  isPostActivityLink,
  parseActivityLogMetadata,
  resolveActivityLogHref,
  resolveActivityLogHrefAsync,
} from "../lib/activityLogLinks";
import type { InteractionActivityLogItem } from "../types";
import type { ActivityLogItem } from "@/pages/dashboard/components/activityLogs/types";

const timeFmt = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" });

function toInteractionLog(item: ActivityLogItem): InteractionActivityLogItem {
  const meta = parseActivityLogMetadata(item.metadata);
  const postId = typeof meta?.postId === "string"
    ? meta.postId
    : typeof meta?.post_id === "string"
      ? meta.post_id
      : undefined;
  return {
    id: item.id,
    userId: item.userId,
    username: item.username,
    fullName: item.fullName,
    avatarUrl: item.avatarUrl,
    actionType: item.actionType,
    actionLabel: item.actionLabel,
    description: item.description,
    createdAt: item.createdAt,
    postId,
    targetType: item.targetType,
    targetId: item.targetId,
    metadata: item.metadata,
  };
}

type ActivityLogListItemProps = {
  log: InteractionActivityLogItem | ActivityLogItem;
  onNavigate?: () => void;
  hrefOverride?: string;
  linkState?: Record<string, string>;
};

export function ActivityLogListItem({
  log,
  onNavigate,
  hrefOverride,
  linkState,
}: ActivityLogListItemProps) {
  const interactionLog = "status" in log ? toInteractionLog(log) : log;
  const [href, setHref] = React.useState<string | null>(
    () => hrefOverride ?? resolveActivityLogHref(interactionLog),
  );

  React.useEffect(() => {
    if (hrefOverride) {
      setHref(hrefOverride);
      return;
    }

    let cancelled = false;
    const syncHref = resolveActivityLogHref(interactionLog);
    if (syncHref) {
      setHref(syncHref);
      return;
    }

    void resolveActivityLogHrefAsync(interactionLog).then((resolved) => {
      if (!cancelled) setHref(resolved);
    });

    return () => {
      cancelled = true;
    };
  }, [
    interactionLog.id,
    interactionLog.actionType,
    interactionLog.targetType,
    interactionLog.targetId,
    interactionLog.metadata,
    interactionLog.postId,
    interactionLog.post_id,
    hrefOverride,
  ]);

  const showPostIcon = isPostActivityLink(href);
  const content = (
    <>
      <Avatar className="size-8 shrink-0">
        <AvatarImage src={interactionLog.avatarUrl ?? undefined} />
        <AvatarFallback className="text-xs">
          {(interactionLog.fullName ?? interactionLog.username ?? "?").charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium truncate">
            {interactionLog.fullName ?? interactionLog.username ?? "Người dùng"}
          </span>
          {interactionLog.actionLabel && (
            <Badge variant="secondary" className="text-[10px] font-normal">
              {interactionLog.actionLabel}
            </Badge>
          )}
        </div>
        {interactionLog.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{interactionLog.description}</p>
        )}
        {interactionLog.createdAt && (
          <p className="text-[10px] text-muted-foreground mt-1">
            {timeFmt.format(new Date(interactionLog.createdAt))}
          </p>
        )}
      </div>
      {showPostIcon && (
        <ExternalLink className="size-3.5 shrink-0 mt-1 text-muted-foreground opacity-60" aria-hidden />
      )}
    </>
  );

  if (!href) {
    return <li className="flex items-start gap-3 px-4 py-3">{content}</li>;
  }

  const linkTitle = href.includes("#comment-")
    ? "Mở bài viết và xem bình luận"
    : isPostActivityLink(href)
      ? "Mở bài viết"
      : "Xem chi tiết";

  return (
    <li>
      <Link
        to={href}
        state={linkState}
        title={linkTitle}
        onClick={onNavigate}
        className="flex items-start gap-3 px-4 py-3 hover:bg-background/80 transition-colors cursor-pointer"
      >
        {content}
      </Link>
    </li>
  );
}

type ActivityLogSidebarListProps = {
  logs: Array<InteractionActivityLogItem | ActivityLogItem>;
  emptyMessage?: string;
  onNavigate?: () => void;
  incompleteNote?: string;
  getHref?: (log: InteractionActivityLogItem | ActivityLogItem) => string;
  linkState?: Record<string, string>;
};

export function ActivityLogSidebarList({
  logs,
  emptyMessage = "Không có log trong mục này.",
  onNavigate,
  incompleteNote,
  getHref,
  linkState,
}: ActivityLogSidebarListProps) {
  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground py-12 text-center px-4">{emptyMessage}</p>;
  }

  return (
    <>
      {incompleteNote ? (
        <p className="text-xs text-muted-foreground px-4 pt-3 pb-1">{incompleteNote}</p>
      ) : null}
      <ul className="divide-y divide-border/60">
        {logs.map((log) => (
          <ActivityLogListItem
            key={log.id}
            log={log}
            onNavigate={onNavigate}
            hrefOverride={getHref?.(log)}
            linkState={linkState}
          />
        ))}
      </ul>
    </>
  );
}
