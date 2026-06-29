import { apiClient } from "@/services/axiosInstance";
import { getPageContent } from "@/services/pagination";
import type { InteractionActivityLogItem } from "../types";
import { lookupAccountIdForActivityUser, resolveCustomerShowHref } from "./customerLinks";

const POST_ACTION_TYPES = new Set([
  "POST_CREATED",
  "COMMENT_ADDED",
  "COMMENT_CREATED",
  "REACTION_ADDED",
  "POST_SHARED",
]);

const COMMENT_ACTION_TYPES = new Set(["COMMENT_ADDED", "COMMENT_CREATED"]);

type PostLookupItem = {
  id: string;
  kind?: string | null;
  authorId?: string | null;
  authorUsername?: string | null;
  createdAt?: string | null;
};

type CommentLookupItem = {
  id: string;
  postId?: string | null;
  authorId?: string | null;
  authorUsername?: string | null;
  createdAt?: string | null;
};

function isPostTargetType(targetType: string | null | undefined): boolean {
  if (!targetType) return false;
  return targetType.toUpperCase() === "POST";
}

function isCommentTargetType(targetType: string | null | undefined): boolean {
  if (!targetType) return false;
  return targetType.toUpperCase() === "COMMENT";
}

export function parseActivityLogMetadata(metadata: string | null | undefined): Record<string, unknown> | null {
  if (!metadata) return null;
  try {
    const parsed = JSON.parse(metadata) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function readMetadataId(meta: Record<string, unknown> | null, ...keys: string[]): string | null {
  if (!meta) return null;
  for (const key of keys) {
    const value = meta[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}

export function extractCommentId(log: InteractionActivityLogItem): string | null {
  const meta = parseActivityLogMetadata(log.metadata);
  const fromMeta = readMetadataId(meta, "commentId", "comment_id");
  if (fromMeta) return fromMeta;

  if (isCommentTargetType(log.targetType) && log.targetId) {
    return log.targetId;
  }

  if (
    log.actionType
    && COMMENT_ACTION_TYPES.has(log.actionType)
    && log.targetId
    && !isPostTargetType(log.targetType)
  ) {
    return log.targetId;
  }

  return null;
}

export function extractPostId(log: InteractionActivityLogItem): string | null {
  const direct = log.postId ?? log.post_id;
  if (direct) return direct;

  const meta = parseActivityLogMetadata(log.metadata);
  const fromMeta = readMetadataId(meta, "postId", "post_id");
  if (fromMeta) return fromMeta;

  if (isPostTargetType(log.targetType) && log.targetId) {
    return log.targetId;
  }

  if (log.actionType === "POST_CREATED" && log.targetId) {
    return log.targetId;
  }

  return null;
}

function extractReactionTargetId(log: InteractionActivityLogItem): string | null {
  const meta = parseActivityLogMetadata(log.metadata);
  const fromMeta = readMetadataId(meta, "targetId", "target_id", "postId", "post_id");
  if (fromMeta) return fromMeta;
  return log.targetId ?? null;
}

export function extractFriendRequestTargetUserId(log: InteractionActivityLogItem): string | null {
  const meta = parseActivityLogMetadata(log.metadata);
  const fromMeta = readMetadataId(
    meta,
    "targetUserId",
    "target_user_id",
    "addresseeId",
    "addressee_id",
  );
  if (fromMeta) return fromMeta;

  const targetType = log.targetType?.toUpperCase();
  if ((targetType === "USER" || targetType === "CUSTOMER") && log.targetId) {
    return log.targetId;
  }
  return null;
}

export function buildPostActivityHref(postId: string, commentId?: string | null): string {
  const base = `/posts/${postId}/show`;
  return commentId ? `${base}#comment-${commentId}` : base;
}

async function lookupCreatedPostHref(log: InteractionActivityLogItem): Promise<string | null> {
  const day = log.createdAt?.slice(0, 10);
  if (!day || (!log.userId && !log.username)) return null;

  try {
    const { data } = await apiClient.get("/api/v1/admin/posts", {
      params: {
        page: 0,
        size: 100,
        sortBy: "createdAt",
        sortDir: "desc",
        postType: "ORIGINAL",
        createdFrom: day,
        createdTo: day,
        ...(log.userId ? { authorId: log.userId } : { search: log.username }),
      },
    });
    const username = log.username?.trim().toLowerCase();
    const candidates = getPageContent<PostLookupItem>(data).filter((post) => (
      post.kind !== "SHARE"
      && (!username || post.authorUsername?.toLowerCase() === username)
    ));
    if (candidates.length === 0) return null;

    const logTime = log.createdAt ? new Date(log.createdAt).getTime() : Number.NaN;
    const closest = Number.isFinite(logTime)
      ? candidates.reduce((best, current) => {
          const bestTime = best.createdAt ? new Date(best.createdAt).getTime() : Number.NaN;
          const currentTime = current.createdAt ? new Date(current.createdAt).getTime() : Number.NaN;
          if (!Number.isFinite(currentTime)) return best;
          if (!Number.isFinite(bestTime)) return current;
          return Math.abs(currentTime - logTime) < Math.abs(bestTime - logTime) ? current : best;
        })
      : candidates[0];

    return closest?.id ? buildPostActivityHref(closest.id) : null;
  } catch {
    return null;
  }
}

async function lookupCommentPostHref(log: InteractionActivityLogItem): Promise<string | null> {
  if (!log.userId || !log.createdAt) return null;

  try {
    const { data } = await apiClient.get("/api/v1/admin/comments", {
      params: {
        page: 0,
        size: 100,
        sortBy: "createdAt",
        sortDir: "desc",
        authorId: log.userId,
      },
    });
    const username = log.username?.trim().toLowerCase();
    const candidates = getPageContent<CommentLookupItem>(data).filter((comment) => (
      Boolean(comment.postId)
      && (!username || comment.authorUsername?.toLowerCase() === username)
    ));
    const logTime = new Date(log.createdAt).getTime();
    if (!Number.isFinite(logTime) || candidates.length === 0) return null;

    const closest = candidates.reduce((best, current) => {
      const bestTime = best.createdAt ? new Date(best.createdAt).getTime() : Number.NaN;
      const currentTime = current.createdAt ? new Date(current.createdAt).getTime() : Number.NaN;
      if (!Number.isFinite(currentTime)) return best;
      if (!Number.isFinite(bestTime)) return current;
      return Math.abs(currentTime - logTime) < Math.abs(bestTime - logTime) ? current : best;
    });
    const closestTime = closest.createdAt ? new Date(closest.createdAt).getTime() : Number.NaN;
    const isMatchingTime = Number.isFinite(closestTime)
      && Math.abs(closestTime - logTime) <= 10 * 60 * 1000;

    return isMatchingTime && closest.postId
      ? buildPostActivityHref(closest.postId, closest.id)
      : null;
  } catch {
    return null;
  }
}

async function lookupReactionPostHref(log: InteractionActivityLogItem): Promise<string | null> {
  const targetId = extractReactionTargetId(log);
  if (!targetId) return null;

  try {
    await apiClient.get(`/api/v1/admin/posts/${targetId}`);
    return buildPostActivityHref(targetId);
  } catch {
    try {
      await apiClient.get(`/api/v1/admin/post-shares/${targetId}`);
      return `/posts/share:${targetId}/show`;
    } catch {
      return null;
    }
  }
}

/** Sync link when post (and optional comment) ids are already on the log. */
export function resolveActivityLogHref(log: InteractionActivityLogItem): string | null {
  const actionType = log.actionType;
  if (!actionType) return null;

  if (POST_ACTION_TYPES.has(actionType)) {
    const postId = extractPostId(log);
    if (!postId) return null;
    const commentId = COMMENT_ACTION_TYPES.has(actionType) ? extractCommentId(log) : null;
    return buildPostActivityHref(postId, commentId);
  }

  if (actionType === "FRIEND_REQUEST_SENT") {
    return null;
  }

  return null;
}

/** Resolves links that need API lookup (comment → post, friend request → customer). */
export async function resolveActivityLogHrefAsync(
  log: InteractionActivityLogItem,
): Promise<string | null> {
  const immediate = resolveActivityLogHref(log);
  if (immediate) return immediate;

  const actionType = log.actionType;
  if (!actionType) return null;

  if (COMMENT_ACTION_TYPES.has(actionType)) {
    const commentId = extractCommentId(log);
    if (commentId) {
      try {
        const { data } = await apiClient.get<{ postId?: string; post_id?: string }>(
          `/api/v1/admin/comments/${commentId}`,
        );
        const postId = data.postId ?? data.post_id;
        if (postId) return buildPostActivityHref(postId, commentId);
      } catch {
        // Fall through to the user/time lookup for legacy logs.
      }
    }
    return lookupCommentPostHref(log);
  }

  if (actionType === "POST_CREATED") {
    return lookupCreatedPostHref(log);
  }

  if (actionType === "REACTION_ADDED") {
    return lookupReactionPostHref(log);
  }

  if (actionType === "FRIEND_REQUEST_SENT") {
    const profileUserId = extractFriendRequestTargetUserId(log);
    const accountId = await lookupAccountIdForActivityUser(profileUserId);
    return resolveCustomerShowHref(accountId);
  }

  return null;
}

export function isPostActivityLink(href: string | null): boolean {
  return href?.startsWith("/posts/") ?? false;
}
