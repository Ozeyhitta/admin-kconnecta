import * as React from "react";
import { useNavigate } from "react-router";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertTriangle,
  FileText,
  Heart,
  Loader2,
  MessageSquare,
  Share2,
  UserPlus2,
  UserRound,
} from "lucide-react";
import {
  lookupAdminUserForActivityUser,
  lookupAccountIdForActivityUser,
  resolveCustomerShowHref,
  type AdminUserRecord,
} from "@/pages/stats/lib/customerLinks";
import {
  extractFriendRequestTargetUserId,
  resolveActivityLogHrefAsync,
} from "@/pages/stats/lib/activityLogLinks";
import { STATUS_LABELS, SEVERITY_LABELS, timeFormatter } from "./activityLogConstants";
import type { ActivityLogItem } from "./types";

interface Props {
  item: ActivityLogItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DetailRow = ({ label, value }: { label: string; value?: string | null }) => (
  <div className="grid grid-cols-[120px_1fr] gap-2 py-1.5 border-b border-dashed last:border-0">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="text-sm break-all">{value || "—"}</span>
  </div>
);

export const ActivityLogDetailDrawer = ({ item, open, onOpenChange }: Props) => {
  const navigate = useNavigate();
  const [profileLoading, setProfileLoading] = React.useState(false);
  const [profileError, setProfileError] = React.useState<string | null>(null);
  const [postLoading, setPostLoading] = React.useState(false);
  const [postError, setPostError] = React.useState<string | null>(null);
  const [friendTarget, setFriendTarget] = React.useState<AdminUserRecord | null>(null);
  const [friendTargetLoading, setFriendTargetLoading] = React.useState(false);
  const [friendTargetError, setFriendTargetError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setProfileLoading(false);
    setProfileError(null);
    setPostLoading(false);
    setPostError(null);
    setFriendTarget(null);
    setFriendTargetError(null);

    if (item?.actionType !== "FRIEND_REQUEST_SENT") {
      setFriendTargetLoading(false);
      return;
    }

    const targetUserId = extractFriendRequestTargetUserId(item);
    if (!targetUserId) {
      setFriendTargetLoading(false);
      setFriendTargetError("Log này không có thông tin người nhận lời mời kết bạn.");
      return;
    }

    let cancelled = false;
    setFriendTargetLoading(true);
    void lookupAdminUserForActivityUser(targetUserId)
      .then((target) => {
        if (cancelled) return;
        setFriendTarget(target);
        if (!target) setFriendTargetError("Không tìm thấy hồ sơ người nhận lời mời.");
      })
      .catch(() => {
        if (!cancelled) setFriendTargetError("Không thể tải thông tin người nhận lời mời.");
      })
      .finally(() => {
        if (!cancelled) setFriendTargetLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [item?.id]);

  if (!item) return null;
  const statusCfg = STATUS_LABELS[item.status] ?? STATUS_LABELS.SUCCESS;
  const severityCfg = SEVERITY_LABELS[item.severity] ?? SEVERITY_LABELS.INFO;
  const name = item.fullName ?? item.username ?? "Không rõ";
  const canOpenUser = Boolean(item.userId || item.username);
  const isCreatedPost = item.actionType === "POST_CREATED";
  const isComment = item.actionType === "COMMENT_ADDED" || item.actionType === "COMMENT_CREATED";
  const isReaction = item.actionType === "REACTION_ADDED";
  const isShare = item.actionType === "POST_SHARED";
  const canOpenPost = isCreatedPost || isComment || isReaction || isShare;
  const isFriendRequest = item.actionType === "FRIEND_REQUEST_SENT";
  const postButtonLabel = isComment
    ? "Xem bài viết có bình luận"
    : isReaction
      ? "Xem bài viết đã bày tỏ cảm xúc"
      : isShare
        ? "Xem bài viết đã chia sẻ"
        : "Xem chi tiết bài viết";

  const handleOpenPost = async () => {
    if (!canOpenPost || postLoading) return;
    setPostLoading(true);
    setPostError(null);

    try {
      const href = await resolveActivityLogHrefAsync(item);
      if (!href) {
        setPostError("Không tìm thấy bài viết tương ứng với hoạt động này.");
        return;
      }
      onOpenChange(false);
      navigate(href);
    } catch {
      setPostError("Không thể mở bài viết. Vui lòng thử lại.");
    } finally {
      setPostLoading(false);
    }
  };

  const handleOpenUser = async () => {
    if (!canOpenUser || profileLoading) return;
    setProfileLoading(true);
    setProfileError(null);

    try {
      const accountId = await lookupAccountIdForActivityUser(item.userId, item.username);
      const href = resolveCustomerShowHref(accountId);
      if (!href) {
        setProfileError("Không tìm thấy hồ sơ người dùng này.");
        return;
      }
      onOpenChange(false);
      navigate(href);
    } catch {
      setProfileError("Không thể mở hồ sơ người dùng. Vui lòng thử lại.");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleOpenFriendTarget = () => {
    const href = resolveCustomerShowHref(friendTarget?.id);
    if (!href) return;
    onOpenChange(false);
    navigate(href);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            Chi tiết hoạt động
            {item.abnormal && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" /> Bất thường
              </Badge>
            )}
          </DrawerTitle>
          <DrawerDescription>
            {item.createdAt ? timeFormatter.format(new Date(item.createdAt)) : ""}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-2 overflow-y-auto">
          <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-muted/40">
            <Avatar className="h-12 w-12">
              {item.avatarUrl && <AvatarImage src={item.avatarUrl} alt={name} />}
              <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{name}</p>
              {item.username && <p className="text-sm text-muted-foreground">@{item.username}</p>}
              {item.userId && <p className="text-[10px] font-mono text-muted-foreground/70 mt-0.5">{item.userId}</p>}
            </div>
          </div>

          {isFriendRequest && (
            <div className="mb-4 rounded-lg border bg-background p-3">
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <UserPlus2 className="h-4 w-4" />
                Kết bạn với
              </p>
              {friendTargetLoading ? (
                <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang tải thông tin người nhận…
                </div>
              ) : friendTarget ? (
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    {friendTarget.avatarUrl && (
                      <AvatarImage
                        src={friendTarget.avatarUrl}
                        alt={friendTarget.fullName ?? friendTarget.username ?? ""}
                      />
                    )}
                    <AvatarFallback>
                      {(friendTarget.fullName ?? friendTarget.username ?? "?").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {friendTarget.fullName ?? friendTarget.username ?? "Người dùng"}
                    </p>
                    {friendTarget.username && (
                      <p className="text-sm text-muted-foreground">@{friendTarget.username}</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-destructive">{friendTargetError}</p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="outline">{item.actionLabel ?? item.actionType}</Badge>
            <Badge variant="outline" className={statusCfg.className}>{statusCfg.label}</Badge>
            <Badge variant="outline" className={severityCfg.className}>{severityCfg.label}</Badge>
          </div>

          {item.abnormal && item.abnormalReason && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <strong>Lý do cảnh báo:</strong> {item.abnormalReason}
            </div>
          )}

          <DetailRow label="Mô tả" value={item.description} />
          <DetailRow label="Loại hành động" value={item.actionType} />
          <DetailRow label="Đối tượng" value={item.targetType ? `${item.targetType}${item.targetId ? ` · ${item.targetId}` : ""}` : undefined} />
          <DetailRow label="IP" value={item.ipAddress} />
          <DetailRow label="Thiết bị" value={item.deviceType} />
          <DetailRow label="Trình duyệt" value={item.browser} />
          <DetailRow label="Hệ điều hành" value={item.os} />
          <DetailRow label="Vị trí" value={item.location} />
          <DetailRow label="User-Agent" value={item.userAgent} />
          {item.metadata && <DetailRow label="Metadata" value={item.metadata} />}
        </div>

        <DrawerFooter>
          {isFriendRequest && friendTarget && (
            <Button type="button" onClick={handleOpenFriendTarget}>
              <UserPlus2 className="h-4 w-4" />
              Xem chi tiết người nhận lời mời
            </Button>
          )}
          {postError && (
            <p className="text-sm text-destructive text-center">{postError}</p>
          )}
          {canOpenPost && (
            <Button
              type="button"
              onClick={() => void handleOpenPost()}
              disabled={postLoading}
            >
              {postLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isComment ? (
                <MessageSquare className="h-4 w-4" />
              ) : isReaction ? (
                <Heart className="h-4 w-4" />
              ) : isShare ? (
                <Share2 className="h-4 w-4" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              {postButtonLabel}
            </Button>
          )}
          {profileError && (
            <p className="text-sm text-destructive text-center">{profileError}</p>
          )}
          <Button
            type="button"
            onClick={() => void handleOpenUser()}
            disabled={!canOpenUser || profileLoading}
          >
            {profileLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserRound className="h-4 w-4" />
            )}
            Xem chi tiết người dùng
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">Đóng</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default ActivityLogDetailDrawer;
