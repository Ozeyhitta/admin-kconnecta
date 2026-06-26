import type { InteractionActivityLogItem } from "../types";
import { lookupAccountIdForActivityUser, resolveCustomerShowHref } from "./customerLinks";

const POST_ACTION_TYPES = new Set([
  "POST_CREATED",
  "COMMENT_ADDED",
  "COMMENT_CREATED",
  "REACTION_ADDED",
  "POST_SHARED",
]);

function isPostTargetType(targetType: string | null | undefined): boolean {
  if (!targetType) return false;
  const normalized = targetType.toUpperCase();
  return normalized === "POST";
}

function parsePostIdFromMetadata(metadata: string): string | null {
  try {
    const parsed = JSON.parse(metadata) as Record<string, unknown>;
    const id = parsed.postId ?? parsed.post_id;
    return typeof id === "string" && id.length > 0 ? id : null;
  } catch {
    return null;
  }
}

export function extractPostId(log: InteractionActivityLogItem): string | null {
  const direct = log.postId ?? log.post_id;
  if (direct) return direct;

  if (isPostTargetType(log.targetType) && log.targetId) {
    return log.targetId;
  }

  if (log.actionType === "POST_CREATED" && log.targetId) {
    return log.targetId;
  }

  if (log.metadata) {
    const fromMetadata = parsePostIdFromMetadata(log.metadata);
    if (fromMetadata) return fromMetadata;
  }

  return null;
}

function extractFriendRequestUserId(log: InteractionActivityLogItem): string | null {
  const targetType = log.targetType?.toUpperCase();
  if ((targetType === "USER" || targetType === "CUSTOMER") && log.targetId) {
    return log.targetId;
  }
  return log.userId ?? null;
}

export function resolveActivityLogHref(log: InteractionActivityLogItem): string | null {
  const actionType = log.actionType;
  if (!actionType) return null;

  if (POST_ACTION_TYPES.has(actionType)) {
    const postId = extractPostId(log);
    return postId ? `/posts/${postId}/show` : null;
  }

  if (actionType === "FRIEND_REQUEST_SENT") {
    return null;
  }

  return null;
}

/** Resolves customer show links that need profile id → account id lookup. */
export async function resolveActivityLogCustomerHref(
  log: InteractionActivityLogItem,
): Promise<string | null> {
  if (log.actionType !== "FRIEND_REQUEST_SENT") return null;
  const profileUserId = extractFriendRequestUserId(log);
  const accountId = await lookupAccountIdForActivityUser(profileUserId, log.username);
  return resolveCustomerShowHref(accountId);
}

export function isPostActivityLink(href: string | null): boolean {
  return href?.startsWith("/posts/") ?? false;
}
