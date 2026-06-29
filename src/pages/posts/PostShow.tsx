import * as React from "react";
import Hls from "hls.js";
import { useDelete, useNotify, useRefresh, useShowController, useUpdate } from "ra-core";
import { Link, useLocation, useNavigate } from "react-router";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Eye,
  EyeOff,
  FileText,
  Globe,
  Heart,
  Lock,
  MapPin,
  MessageSquare,
  Radio,
  Share2,
  Star,
  Trash2,
  Users,
  Video,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Confirm } from "@/components/admin/confirm";
import { apiClient } from "@/services/axiosInstance";
import { formatPostReportReason } from "@/lib/postReportDisplay";
import { getPageContent } from "@/services/pagination";

interface PostStats {
  reactionCount: number;
  commentCount: number;
  shareCount: number;
  reportCount?: number;
}

interface PostReport {
  id: string;
  reporterFullName?: string | null;
  reporterUsername?: string | null;
  reporterAvatarUrl?: string | null;
  category?: string | null;
  reason?: string | null;
  createdAt?: string | null;
}

interface LiveSession {
  id: string;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  recordingStatus?: string | null;
  playbackUrl?: string | null;
  hlsPlaybackUrl?: string | null;
  thumbnailUrl?: string | null;
  recordingDurationSec?: number | null;
  startedAt?: string | null;
  endedAt?: string | null;
  viewerCount?: number;
  peakViewerCount?: number;
  totalReactionCount?: number;
  createdAt?: string | null;
}

interface PostMedia {
  id?: string;
  mediaType: "IMAGE" | "VIDEO" | "DOCUMENT";
  fileUrl: string;
  thumbnailUrl?: string | null;
  sortOrder?: number | null;
}

interface Comment {
  id: string;
  postId?: string;
  authorUsername: string;
  authorFullName: string;
  authorAvatarUrl: string;
  content: string;
  createdAt: string;
  deleted: boolean;
  parentCommentId: string | null;
}

const fmt = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" });
const fmtNum = new Intl.NumberFormat("vi-VN");

const isShareRecordId = (id: unknown): boolean =>
  typeof id === "string" && id.startsWith("share:");

const PRIVACY_META: Record<string, { label: string; icon: React.FC<{ className?: string }> }> = {
  PUBLIC: { label: "Công khai", icon: Globe },
  FRIENDS: { label: "Bạn bè", icon: Users },
  FRIENDS_EXCEPT: { label: "Ngoại trừ bạn bè", icon: Users },
  PRIVATE: { label: "Chỉ mình tôi", icon: Lock },
};

const StatChip = ({
  icon: Icon,
  color,
  label,
  value,
  loading,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.FC<any>;
  color: string;
  label: string;
  value: number | undefined;
  loading: boolean;
}) => (
  <div className="flex flex-1 flex-col items-center gap-0.5 rounded-lg bg-muted/50 px-4 py-3">
    <Icon className={`h-5 w-5 ${color}`} />
    {loading ? (
      <Skeleton className="h-5 w-8" />
    ) : (
      <span className="text-base font-bold tabular-nums">
        {value !== undefined ? fmtNum.format(value) : "-"}
      </span>
    )}
    <span className="text-xs text-muted-foreground">{label}</span>
  </div>
);

const getMediaFileName = (url: string): string => {
  try {
    const path = new URL(url).pathname;
    return decodeURIComponent(path.slice(path.lastIndexOf("/") + 1)) || "Tệp đính kèm";
  } catch {
    return "Tệp đính kèm";
  }
};

const PostMediaGallery = ({
  media,
  legacyImageUrl,
}: {
  media?: PostMedia[] | null;
  legacyImageUrl?: string | null;
}) => {
  const items = [...(media ?? [])]
    .filter((item) => Boolean(item?.fileUrl))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  if (items.length === 0 && legacyImageUrl) {
    items.push({ mediaType: "IMAGE", fileUrl: legacyImageUrl, sortOrder: 0 });
  }

  if (items.length === 0) return null;

  return (
    <div className={items.length > 1 ? "grid grid-cols-1 gap-2 sm:grid-cols-2" : "grid gap-2"}>
      {items.map((item, index) => {
        const key = item.id ?? `${item.fileUrl}-${index}`;
        if (item.mediaType === "VIDEO") {
          return (
            <video
              key={key}
              controls
              playsInline
              preload="metadata"
              poster={item.thumbnailUrl ?? undefined}
              src={item.fileUrl}
              className="max-h-[32rem] w-full rounded-lg border bg-black object-contain"
            />
          );
        }
        if (item.mediaType === "DOCUMENT") {
          return (
            <a
              key={key}
              href={item.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-w-0 items-center gap-3 rounded-lg border bg-muted/30 p-4 transition-colors hover:bg-muted"
            >
              <FileText className="h-8 w-8 shrink-0 text-primary" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{getMediaFileName(item.fileUrl)}</span>
                <span className="block text-xs text-muted-foreground">Mở tệp Cloudinary</span>
              </span>
            </a>
          );
        }
        return (
          <img
            key={key}
            src={item.fileUrl}
            alt={`Ảnh bài đăng ${index + 1}`}
            loading="lazy"
            className="max-h-[32rem] w-full rounded-lg border bg-muted/20 object-contain"
          />
        );
      })}
    </div>
  );
};

const CommentsSection = ({
  postId,
  refresh,
  highlightCommentId,
}: {
  postId: string;
  refresh: number;
  highlightCommentId?: string | null;
}) => {
  const [comments, setComments] = React.useState<Comment[] | null>(null);
  const [commentToDelete, setCommentToDelete] = React.useState<string | null>(null);
  const [deletingComment, setDeletingComment] = React.useState(false);
  const [flashCommentId, setFlashCommentId] = React.useState<string | null>(null);
  const notify = useNotify();

  React.useEffect(() => {
    if (!postId) return;
    let cancelled = false;

    const loadComments = async () => {
      try {
        const listPromise = apiClient.get<{ content: Comment[] }>("/api/v1/admin/comments", {
          params: {
            postId,
            page: 0,
            size: highlightCommentId ? 100 : 20,
            sortBy: "createdAt",
            sortDir: "asc",
          },
        });

        const highlightPromise = highlightCommentId
          ? apiClient.get<Comment>(`/api/v1/admin/comments/${highlightCommentId}`).catch(() => null)
          : Promise.resolve(null);

        const [listRes, highlightRes] = await Promise.all([listPromise, highlightPromise]);
        if (cancelled) return;

        let next = listRes.data.content ?? [];
        const highlighted = highlightRes?.data;
        if (highlighted) {
          const belongsToPost = !highlighted.postId || highlighted.postId === postId;
          if (belongsToPost && !next.some((comment) => comment.id === highlighted.id)) {
            next = [...next, highlighted].sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
            );
          }
        }

        setComments(next);
      } catch {
        if (!cancelled) setComments([]);
      }
    };

    void loadComments();
    return () => {
      cancelled = true;
    };
  }, [postId, refresh, highlightCommentId]);

  React.useEffect(() => {
    if (!highlightCommentId || !comments?.length) return;
    const el = document.getElementById(`comment-${highlightCommentId}`);
    if (!el) return;

    const frame = window.requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setFlashCommentId(highlightCommentId);
    });

    const timer = window.setTimeout(() => setFlashCommentId(null), 3000);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [comments, highlightCommentId]);

  const handleDelete = async (id: string) => {
    setDeletingComment(true);
    try {
      await apiClient.delete(`/api/v1/admin/comments/${id}`);
      setComments((prev) => prev?.filter((c) => c.id !== id) ?? null);
      notify("Đã xóa bình luận", { type: "success" });
    } catch {
      notify("Xóa thất bại", { type: "error" });
    } finally {
      setDeletingComment(false);
      setCommentToDelete(null);
    }
  };

  if (comments === null) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (comments.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Chưa có bình luận nào</p>;
  }

  return (
    <div className="divide-y">
      {comments.map((c) => (
        <div
          key={c.id}
          id={`comment-${c.id}`}
          className={[
            "flex gap-2.5 py-3 scroll-mt-24 transition-colors",
            c.deleted ? "opacity-50" : "",
            flashCommentId === c.id ? "rounded-lg bg-pink-50 ring-2 ring-pink-400 -mx-1 px-1" : "",
          ].join(" ").trim()}
        >
          <Avatar className="mt-0.5 h-7 w-7 shrink-0">
            <AvatarImage src={c.authorAvatarUrl} />
            <AvatarFallback className="text-xs">
              {(c.authorFullName ?? c.authorUsername ?? "?").charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium">{c.authorFullName ?? c.authorUsername}</span>
              {c.parentCommentId ? <span className="text-xs text-muted-foreground">trả lời</span> : null}
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                {c.createdAt ? fmt.format(new Date(c.createdAt)) : "-"}
              </span>
            </div>
            <p className="mt-0.5 break-words text-sm text-foreground/90">
              {c.deleted ? <em className="text-muted-foreground">Đã xóa</em> : c.content}
            </p>
          </div>
          {!c.deleted ? (
            <button
              onClick={() => setCommentToDelete(c.id)}
              className="mt-1 shrink-0 cursor-pointer text-muted-foreground transition-colors hover:text-destructive"
              title="Xóa bình luận"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      ))}
      <Confirm
        isOpen={commentToDelete !== null}
        title="Xác nhận xóa bình luận?"
        content="Hành động này không thể hoàn tác."
        cancel="Hủy"
        confirm="Xóa"
        confirmColor="warning"
        onClose={() => setCommentToDelete(null)}
        onConfirm={() => {
          if (commentToDelete) void handleDelete(commentToDelete);
        }}
        loading={deletingComment}
      />
    </div>
  );
};

const ReportsSection = ({ postId, refresh }: { postId: string; refresh: number }) => {
  const [reports, setReports] = React.useState<PostReport[] | null>(null);

  React.useEffect(() => {
    if (!postId) return;
    apiClient
      .get<{ content: PostReport[] }>("/api/v1/admin/post-reports", {
        params: { postId, page: 0, size: 50, sortBy: "createdAt", sortDir: "desc" },
      })
      .then((r) => setReports(getPageContent(r.data)))
      .catch(() => setReports([]));
  }, [postId, refresh]);

  if (reports === null) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (reports.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Chưa có báo cáo nào</p>;
  }

  return (
    <div className="divide-y">
      {reports.map((report) => {
        const reporterName = report.reporterFullName ?? report.reporterUsername ?? "Người dùng";
        const reason = formatPostReportReason(report.reason, report.category);
        return (
          <div key={report.id} className="flex gap-3 py-3">
            <Avatar className="mt-0.5 h-7 w-7 shrink-0">
              <AvatarImage src={report.reporterAvatarUrl ?? undefined} />
              <AvatarFallback className="text-xs">{reporterName.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-sm font-medium">{reporterName}</span>
                {report.reporterUsername ? (
                  <span className="text-xs text-muted-foreground">@{report.reporterUsername}</span>
                ) : null}
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                  {report.createdAt ? fmt.format(new Date(report.createdAt)) : "-"}
                </span>
              </div>
              <p className="mt-1 break-words text-sm text-foreground/90">{reason}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const LIVE_STATUS_META: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Bản nháp", className: "border-gray-300 bg-gray-50 text-gray-600" },
  SCHEDULED: { label: "Đã lên lịch", className: "border-blue-300 bg-blue-50 text-blue-700" },
  LIVE: { label: "Đang phát trực tiếp", className: "border-red-300 bg-red-50 text-red-600" },
  ENDED: { label: "Đã kết thúc", className: "border-gray-300 bg-gray-50 text-gray-600" },
  CANCELED: { label: "Đã hủy", className: "border-gray-300 bg-gray-50 text-gray-500" },
};

const RECORDING_STATUS_LABEL: Record<string, string> = {
  NONE: "Không ghi hình",
  RECORDING: "Đang ghi hình",
  PROCESSING: "Đang xử lý bản ghi",
  READY: "Bản ghi sẵn sàng",
  FAILED: "Ghi hình thất bại",
};

const formatDuration = (seconds?: number | null): string | null => {
  if (!seconds || seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
};

const LivePlaybackVideo = ({ url, poster }: { url: string; poster?: string | null }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    const isHls = /\.m3u8(?:$|\?)/i.test(url);
    if (isHls && video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
    } else if (isHls && Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(video);
    } else {
      video.src = url;
    }

    return () => {
      hls?.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [url]);

  return (
    <video
      ref={videoRef}
      controls
      playsInline
      poster={poster ?? undefined}
      className="max-h-96 w-full rounded-lg border bg-black object-contain"
    />
  );
};

const LiveSessionSection = ({ postId }: { postId: string }) => {
  const [session, setSession] = React.useState<LiveSession | null | undefined>(undefined);

  React.useEffect(() => {
    if (!postId) return;
    let cancelled = false;
    apiClient
      .get<LiveSession>(`/api/v1/admin/posts/${postId}/live-session`)
      .then((r) => {
        if (!cancelled) setSession(r.data);
      })
      .catch(() => {
        if (!cancelled) setSession(null);
      });
    return () => {
      cancelled = true;
    };
  }, [postId]);

  // undefined = still loading, null = not a livestream post → render nothing.
  if (session === undefined || session === null) return null;

  const statusMeta = session.status
    ? LIVE_STATUS_META[session.status] ?? { label: session.status, className: "border-gray-300 bg-gray-50 text-gray-600" }
    : null;
  const recordingLabel = session.recordingStatus
    ? RECORDING_STATUS_LABEL[session.recordingStatus] ?? session.recordingStatus
    : null;
  const duration = formatDuration(session.recordingDurationSec);
  const playbackUrl = session.playbackUrl || session.hlsPlaybackUrl;

  return (
    <Card className="border-red-200">
      <CardContent className="space-y-4 pt-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
            <Radio className="h-3 w-3" /> Livestream
          </span>
          {statusMeta ? (
            <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${statusMeta.className}`}>
              {statusMeta.label}
            </span>
          ) : null}
        </div>
        
        {session.title ? (
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-foreground leading-snug">{session.title.trim()}</h3>
            {session.description ? (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{session.description.trim()}</p>
            ) : null}
          </div>
        ) : null}

        {playbackUrl ? (
          <LivePlaybackVideo url={playbackUrl} poster={session.thumbnailUrl} />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 py-10 text-center">
            <Video className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {session.status === "LIVE"
                ? "Phiên đang phát trực tiếp — bản ghi sẽ có sau khi kết thúc."
                : session.recordingStatus === "PROCESSING" || session.recordingStatus === "RECORDING"
                  ? "Bản ghi đang được xử lý, vui lòng quay lại sau."
                  : session.recordingStatus === "FAILED"
                    ? "Ghi hình thất bại — không có bản ghi để phát lại."
                    : "Không có bản ghi phát lại cho phiên này."}
            </p>
            {session.hlsPlaybackUrl ? (
              <a
                href={session.hlsPlaybackUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-primary underline"
              >
                Mở luồng HLS
              </a>
            ) : null}
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t pt-3 text-xs sm:grid-cols-4">
          <LiveStat icon={Users} label="Xem cao nhất" value={fmtNum.format(session.peakViewerCount ?? 0)} />
          <LiveStat icon={Heart} label="Lượt thả tim" value={fmtNum.format(session.totalReactionCount ?? 0)} />
          {recordingLabel ? <LiveStat icon={Video} label="Bản ghi" value={recordingLabel} /> : null}
          {duration ? <LiveStat icon={Clock} label="Thời lượng" value={duration} /> : null}
          {session.startedAt ? (
            <LiveStat icon={Calendar} label="Bắt đầu" value={fmt.format(new Date(session.startedAt))} />
          ) : null}
          {session.endedAt ? (
            <LiveStat icon={Calendar} label="Kết thúc" value={fmt.format(new Date(session.endedAt))} />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};

const LiveStat = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.FC<{ className?: string }>;
  label: string;
  value: string;
}) => (
  <div className="flex flex-col gap-0.5">
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <Icon className="h-3 w-3" /> {label}
    </span>
    <span className="font-medium tabular-nums">{value}</span>
  </div>
);

export const PostShow = () => {
  const { record, isLoading } = useShowController();
  const location = useLocation();
  const [update] = useUpdate();
  const [deleteOne] = useDelete();
  const notify = useNotify();
  const refresh = useRefresh();
  const navigate = useNavigate();
  const returnTo = (
    location.state
    && typeof location.state === "object"
    && "returnTo" in location.state
    && typeof location.state.returnTo === "string"
  )
    ? location.state.returnTo
    : null;
  const handleBack = () => {
    if (returnTo) {
      navigate(returnTo);
      return;
    }
    navigate(-1);
  };

  const [stats, setStats] = React.useState<PostStats | undefined>();
  const [statsLoading, setStatsLoading] = React.useState(true);
  const [commentRefresh, setCommentRefresh] = React.useState(0);
  const [reportRefresh, setReportRefresh] = React.useState(0);
  const [updatingVisibility, setUpdatingVisibility] = React.useState(false);
  const [deleteDialog, setDeleteDialog] = React.useState(false);

  const highlightCommentId = React.useMemo(() => {
    const match = location.hash.match(/^#comment-(.+)$/);
    return match?.[1] ?? null;
  }, [location.hash]);

  React.useEffect(() => {
    if (!record?.id || isShareRecordId(record.id)) return;
    setStatsLoading(true);
    apiClient
      .get<PostStats>(`/api/v1/admin/posts/${record.id}/stats`)
      .then((r) => setStats(r.data))
      .catch(() => setStats(undefined))
      .finally(() => setStatsLoading(false));
  }, [record?.id]);

  const handleVisibilityChange = async () => {
    if (!record) return;
    const nextStatus = record.status === "HIDDEN" ? "PUBLISHED" : "HIDDEN";
    setUpdatingVisibility(true);
    try {
      await update(
        "posts",
        { id: record.id, data: { status: nextStatus }, previousData: record },
        { returnPromise: true },
      );
      notify(nextStatus === "HIDDEN" ? "Đã ẩn bài đăng" : "Đã khôi phục hiển thị bài đăng", {
        type: "success",
      });
      refresh();
    } catch {
      notify("Cập nhật thất bại", { type: "error" });
    } finally {
      setUpdatingVisibility(false);
    }
  };

  const handleDelete = async () => {
    if (!record) return;
    try {
      await deleteOne("posts", { id: record.id, previousData: record }, { returnPromise: true });
      notify("Đã xóa bài đăng", { type: "success" });
      navigate("/posts");
    } catch {
      notify("Xóa thất bại", { type: "error" });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-32" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  if (!record) return null;

  if (isShareRecordId(record.id)) {
    return <ShareDetailView record={record} onBack={handleBack} returnTo={returnTo} />;
  }

  const privacyMeta = PRIVACY_META[record.privacy] ?? { label: record.privacy, icon: Globe };
  const PrivacyIcon = privacyMeta.icon;
  const isHidden = record.status === "HIDDEN";

  return (
    <div className="space-y-4 pb-8">
      <button
        onClick={handleBack}
        className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {returnTo ? "Quay lại chi tiết tổng hoạt động" : "Quay lại danh sách"}
      </button>

      {isHidden ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-start gap-3 p-4 text-sm text-amber-900">
            <EyeOff className="mt-0.5 h-4 w-4 shrink-0" />
            Bài đăng này đang bị admin ẩn và sẽ không hiển thị ở bảng tin người dùng.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardContent className="space-y-4 pt-5">
              <div className="flex items-start gap-3">
                <Link to={`/customers/${record.authorAccountId}/show`}>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={record.authorAvatarUrl} />
                    <AvatarFallback>
                      {(record.authorFullName ?? record.authorUsername ?? "?").charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/customers/${record.authorAccountId}/show`}
                    className="text-sm font-semibold hover:underline"
                  >
                    {record.authorFullName ?? record.authorUsername ?? "-"}
                  </Link>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <PrivacyIcon className="h-3 w-3" />
                    <span>{privacyMeta.label}</span>
                    {record.publishedAt ? (
                      <>
                        <span>·</span>
                        <Calendar className="h-3 w-3" />
                        <span>{fmt.format(new Date(record.publishedAt))}</span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              {record.content ? (
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{record.content}</p>
              ) : (
                <p className="text-sm italic text-muted-foreground">Không có nội dung văn bản</p>
              )}

              <PostMediaGallery media={record.media} legacyImageUrl={record.imageUrl} />

              <div className="flex flex-wrap items-center gap-3 border-t pt-1 text-xs text-muted-foreground">
                {record.locationText ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {record.locationText}
                  </span>
                ) : null}
                {record.promoted ? (
                  <span className="inline-flex items-center gap-1 font-medium text-amber-600">
                    <Star className="h-3 w-3" />
                    Promoted
                  </span>
                ) : null}
                {record.scheduledAt ? (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Lên lịch: {fmt.format(new Date(record.scheduledAt))}
                  </span>
                ) : null}
              </div>

              <div className="flex gap-2 pt-1">
                <StatChip icon={Heart} color="text-red-400" label="Cảm xúc" value={stats?.reactionCount} loading={statsLoading} />
                <StatChip icon={MessageSquare} color="text-pink-500" label="Bình luận" value={stats?.commentCount} loading={statsLoading} />
                <StatChip icon={Share2} color="text-yellow-500" label="Chia sẻ" value={stats?.shareCount} loading={statsLoading} />
              </div>
            </CardContent>
          </Card>

          <LiveSessionSection postId={record.id} />

          <Card>
            <CardContent className="pt-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Bình luận ({fmtNum.format(stats?.commentCount ?? 0)})
                </p>
                <button
                  onClick={() => setCommentRefresh((n) => n + 1)}
                  className="cursor-pointer text-xs text-muted-foreground hover:text-foreground"
                >
                  Làm mới
                </button>
              </div>
              <CommentsSection
                postId={record.id}
                refresh={commentRefresh}
                highlightCommentId={highlightCommentId}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Báo cáo ({fmtNum.format(stats?.reportCount ?? 0)})
                </p>
                <button
                  onClick={() => setReportRefresh((n) => n + 1)}
                  className="cursor-pointer text-xs text-muted-foreground hover:text-foreground"
                >
                  Làm mới
                </button>
              </div>
              <ReportsSection postId={record.id} refresh={reportRefresh} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Thao tác</p>

              <Button
                variant={isHidden ? "default" : "outline"}
                size="sm"
                className="w-full"
                onClick={handleVisibilityChange}
                disabled={updatingVisibility}
              >
                {isHidden ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
                {isHidden ? "Khôi phục hiển thị" : "Ẩn bài đăng"}
              </Button>

              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => setDeleteDialog(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Xóa vĩnh viễn
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2.5 pt-4 text-sm">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Thông tin bài đăng
              </p>
              <InfoRow label="ID">
                <span className="break-all font-mono text-xs">{record.id}</span>
              </InfoRow>
              <InfoRow label="Tác giả">
                <Link to={`/customers/${record.authorAccountId}/show`} className="font-medium hover:underline">
                  {record.authorFullName ?? record.authorUsername ?? "-"}
                </Link>
              </InfoRow>
              <InfoRow label="Quyền xem">
                <span className="inline-flex items-center gap-1">
                  <PrivacyIcon className="h-3 w-3" /> {privacyMeta.label}
                </span>
              </InfoRow>
              {record.locationText ? (
                <InfoRow label="Vị trí">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {record.locationText}
                  </span>
                </InfoRow>
              ) : null}
              {record.promoted ? (
                <InfoRow label="Promoted">
                  <span className="inline-flex items-center gap-1 text-amber-600">
                    <Star className="h-3 w-3" /> Có
                  </span>
                </InfoRow>
              ) : null}
              <InfoRow label="Ngày tạo">
                {record.createdAt ? fmt.format(new Date(record.createdAt)) : "-"}
              </InfoRow>
              {record.publishedAt ? (
                <InfoRow label="Ngày đăng">{fmt.format(new Date(record.publishedAt))}</InfoRow>
              ) : null}
              {record.scheduledAt ? (
                <InfoRow label="Lên lịch lúc">{fmt.format(new Date(record.scheduledAt))}</InfoRow>
              ) : null}
              <InfoRow label="Cập nhật">
                {record.updatedAt ? fmt.format(new Date(record.updatedAt)) : "-"}
              </InfoRow>
              {(stats?.reportCount ?? 0) > 0 ? (
                <InfoRow label="Báo cáo">
                  <span className="font-medium text-orange-600">
                    {fmtNum.format(stats?.reportCount ?? 0)}
                  </span>
                </InfoRow>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa vĩnh viễn bài đăng?</DialogTitle>
            <DialogDescription>
              Hành động này không thể hoàn tác. Bài đăng, dữ liệu liên quan và các tệp media do KConnecta quản lý
              trên Cloudinary sẽ bị xóa.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(false)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setDeleteDialog(false);
                void handleDelete();
              }}
            >
              Xóa vĩnh viễn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const InfoRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex justify-between gap-2">
    <span className="shrink-0 text-muted-foreground">{label}</span>
    <span className="text-right font-medium">{children}</span>
  </div>
);

// Detail view for a shared-post row: the share (who/when/caption) plus the original
// post summary, with a link through to the original's full detail page.
const ShareDetailView = ({
  record,
  onBack,
  returnTo,
}: {
  record: Record<string, any>;
  onBack: () => void;
  returnTo: string | null;
}) => {
  const navigate = useNavigate();
  const [deleteOne] = useDelete();
  const notify = useNotify();
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const original = (record.original ?? {}) as Record<string, any>;
  const sharerName = record.sharerFullName ?? record.sharerUsername ?? "—";
  const originalAuthor = original.authorFullName ?? original.authorUsername ?? "—";
  const caption = (record.sharedContent ?? "").trim();
  const originalText = (original.content ?? "").trim();
  const reportCount = Number(original.reportCount ?? 0);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteOne("posts", { id: record.id, previousData: record }, { returnPromise: true });
      notify("Đã xóa lượt chia sẻ", { type: "success" });
      navigate("/posts");
    } catch {
      notify("Xóa thất bại", { type: "error" });
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  return (
    <div className="space-y-4 pb-8">
      <button
        onClick={onBack}
        className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {returnTo ? "Quay lại chi tiết tổng hoạt động" : "Quay lại danh sách"}
      </button>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardContent className="space-y-3 pt-5">
              <span className="inline-flex w-fit items-center gap-1 rounded-md border border-yellow-300 bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700">
                <Share2 className="h-3 w-3" /> Lượt chia sẻ
              </span>
              <div className="flex items-start gap-3">
                <Link to={`/customers/${record.sharerAccountId}/show`}>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={record.sharerAvatarUrl} />
                    <AvatarFallback>{sharerName.charAt(0)}</AvatarFallback>
                  </Avatar>
                </Link>
                <div className="min-w-0 flex-1">
                  <Link to={`/customers/${record.sharerAccountId}/show`} className="text-sm font-semibold hover:underline">
                    {sharerName}
                  </Link>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{record.createdAt ? fmt.format(new Date(record.createdAt)) : "-"}</span>
                  </div>
                </div>
              </div>
              {caption ? (
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{caption}</p>
              ) : (
                <p className="text-sm italic text-muted-foreground">Không có chú thích</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 pt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bài gốc</p>
              <div className="flex items-start gap-3">
                <Link to={`/customers/${original.authorAccountId}/show`}>
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={original.authorAvatarUrl} />
                    <AvatarFallback>{originalAuthor.charAt(0)}</AvatarFallback>
                  </Avatar>
                </Link>
                <div className="min-w-0 flex-1">
                  <Link to={`/customers/${original.authorAccountId}/show`} className="text-sm font-semibold hover:underline">
                    {originalAuthor}
                  </Link>
                  {original.authorUsername ? (
                    <p className="text-xs text-muted-foreground">@{original.authorUsername}</p>
                  ) : null}
                </div>
              </div>
              {originalText ? (
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{originalText}</p>
              ) : (
                <p className="text-sm italic text-muted-foreground">Không có nội dung văn bản</p>
              )}
              <PostMediaGallery media={original.media} legacyImageUrl={original.imageUrl} />
              {reportCount > 0 ? (
                <p className="text-xs text-orange-600">{fmtNum.format(reportCount)} báo cáo trên bài gốc</p>
              ) : null}
              {original.id ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/posts/${original.id}/show`)}
                >
                  Mở chi tiết bài gốc
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Thao tác</p>
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Xóa lượt chia sẻ
              </Button>
              <p className="text-xs text-muted-foreground">
                Chỉ xóa lượt chia sẻ này; bài gốc được giữ nguyên.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2.5 pt-4 text-sm">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Thông tin</p>
              <InfoRow label="Người chia sẻ">
                <Link to={`/customers/${record.sharerAccountId}/show`} className="font-medium hover:underline">
                  {sharerName}
                </Link>
              </InfoRow>
              <InfoRow label="Thời gian">
                {record.createdAt ? fmt.format(new Date(record.createdAt)) : "-"}
              </InfoRow>
              <InfoRow label="ID">
                <span className="break-all font-mono text-xs">{record.id}</span>
              </InfoRow>
            </CardContent>
          </Card>
        </div>
      </div>

      <Confirm
        isOpen={deleteOpen}
        title="Xóa lượt chia sẻ?"
        content="Chỉ lượt chia sẻ này bị xóa, bài gốc vẫn được giữ. Hành động không thể hoàn tác."
        cancel="Hủy"
        confirm="Xóa"
        confirmColor="warning"
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
        loading={deleting}
      />
    </div>
  );
};
