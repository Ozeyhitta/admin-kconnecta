import * as React from "react";
import { useDelete, useNotify, useRefresh, useShowController, useUpdate } from "ra-core";
import { Link, useNavigate } from "react-router";
import {
  ArrowLeft,
  Calendar,
  Eye,
  EyeOff,
  Globe,
  Heart,
  Lock,
  MapPin,
  MessageSquare,
  Share2,
  Star,
  Trash2,
  Users,
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

interface Comment {
  id: string;
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

const CommentsSection = ({ postId, refresh }: { postId: string; refresh: number }) => {
  const [comments, setComments] = React.useState<Comment[] | null>(null);
  const [commentToDelete, setCommentToDelete] = React.useState<string | null>(null);
  const [deletingComment, setDeletingComment] = React.useState(false);
  const notify = useNotify();

  React.useEffect(() => {
    if (!postId) return;
    apiClient
      .get<{ content: Comment[] }>("/api/v1/admin/comments", {
        params: { postId, page: 0, size: 20, sortBy: "createdAt", sortDir: "asc" },
      })
      .then((r) => setComments(r.data.content))
      .catch(() => setComments([]));
  }, [postId, refresh]);

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
        <div key={c.id} className={`flex gap-2.5 py-3 ${c.deleted ? "opacity-50" : ""}`}>
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

export const PostShow = () => {
  const { record, isLoading } = useShowController();
  const [update] = useUpdate();
  const [deleteOne] = useDelete();
  const notify = useNotify();
  const refresh = useRefresh();
  const navigate = useNavigate();

  const [stats, setStats] = React.useState<PostStats | undefined>();
  const [statsLoading, setStatsLoading] = React.useState(true);
  const [commentRefresh, setCommentRefresh] = React.useState(0);
  const [reportRefresh, setReportRefresh] = React.useState(0);
  const [updatingVisibility, setUpdatingVisibility] = React.useState(false);
  const [deleteDialog, setDeleteDialog] = React.useState(false);

  React.useEffect(() => {
    if (!record?.id) return;
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

  const privacyMeta = PRIVACY_META[record.privacy] ?? { label: record.privacy, icon: Globe };
  const PrivacyIcon = privacyMeta.icon;
  const isHidden = record.status === "HIDDEN";

  return (
    <div className="space-y-4 pb-8">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Quay lại danh sách
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
                <Link to={`/customers/${record.authorId}/show`}>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={record.authorAvatarUrl} />
                    <AvatarFallback>
                      {(record.authorFullName ?? record.authorUsername ?? "?").charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/customers/${record.authorId}/show`}
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

              {record.imageUrl ? (
                <img
                  src={record.imageUrl}
                  alt="Ảnh bài đăng"
                  className="max-h-96 w-full rounded-lg border object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : null}

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
              <CommentsSection postId={record.id} refresh={commentRefresh} />
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
                <Link to={`/customers/${record.authorId}/show`} className="font-medium hover:underline">
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
              Hành động này không thể hoàn tác. Bài đăng và toàn bộ dữ liệu liên quan sẽ bị xóa khỏi cơ sở dữ liệu.
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
