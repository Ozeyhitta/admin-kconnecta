import * as React from "react";
import { useShowController, useUpdate, useDelete, useNotify, useRefresh } from "ra-core";
import { useNavigate, Link } from "react-router";
import {
  ArrowLeft, MapPin, Star, Globe, Users, Lock, Eye,
  Heart, MessageSquare, Share2, FileText, Trash2, Calendar,
  ShieldAlert,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { apiClient } from "@/services/axiosInstance";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PostStats { reactionCount: number; commentCount: number; shareCount: number }
interface Comment {
  id: string; authorUsername: string; authorFullName: string; authorAvatarUrl: string;
  content: string; createdAt: string; deleted: boolean; parentCommentId: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" });
const fmtNum = new Intl.NumberFormat("vi-VN");

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PUBLISHED: { label: "Hiển thị",    variant: "default" },
  DRAFT:     { label: "Bản nháp",    variant: "outline" },
  SCHEDULED: { label: "Đã lên lịch", variant: "secondary" },
  DELETED:   { label: "Đã xóa",      variant: "destructive" },
};

const PRIVACY_META: Record<string, { label: string; icon: React.FC<{ className?: string }> }> = {
  PUBLIC:         { label: "Công khai",      icon: Globe },
  FRIENDS:        { label: "Bạn bè",         icon: Users },
  FRIENDS_EXCEPT: { label: "Ngoại trừ BĐ",  icon: Users },
  PRIVATE:        { label: "Chỉ mình tôi",   icon: Lock },
};

// ─── Stat chip ────────────────────────────────────────────────────────────────

const StatChip = ({
  icon: Icon, color, label, value, loading,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.FC<any>; color: string; label: string; value: number | undefined; loading: boolean;
}) => (
  <div className="flex flex-col items-center gap-0.5 px-4 py-3 rounded-lg bg-muted/50 flex-1">
    <Icon className={`h-5 w-5 ${color}`} />
    {loading ? <Skeleton className="h-5 w-8" /> : (
      <span className="text-base font-bold tabular-nums">{value !== undefined ? fmtNum.format(value) : "—"}</span>
    )}
    <span className="text-xs text-muted-foreground">{label}</span>
  </div>
);

// ─── Comments ─────────────────────────────────────────────────────────────────

const CommentsSection = ({ postId, refresh }: { postId: string; refresh: number }) => {
  const [comments, setComments] = React.useState<Comment[] | null>(null);
  const notify = useNotify();

  React.useEffect(() => {
    if (!postId) return;
    apiClient.get<{ content: Comment[] }>("/api/v1/admin/comments", {
      params: { postId, page: 0, size: 20, sortBy: "createdAt", sortDir: "asc" },
    })
      .then(r => setComments(r.data.content))
      .catch(() => setComments([]));
  }, [postId, refresh]);

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/api/v1/admin/comments/${id}`);
      setComments(prev => prev?.filter(c => c.id !== id) ?? null);
      notify("Đã xóa bình luận", { type: "success" });
    } catch {
      notify("Xóa thất bại", { type: "error" });
    }
  };

  if (comments === null) return (
    <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
  );

  if (comments.length === 0) return (
    <p className="text-sm text-muted-foreground text-center py-6">Chưa có bình luận nào</p>
  );

  return (
    <div className="divide-y">
      {comments.map(c => (
        <div key={c.id} className={`flex gap-2.5 py-3 ${c.deleted ? "opacity-50" : ""}`}>
          <Avatar className="w-7 h-7 shrink-0 mt-0.5">
            <AvatarImage src={c.authorAvatarUrl} />
            <AvatarFallback className="text-xs">
              {(c.authorFullName ?? c.authorUsername ?? "?").charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium">{c.authorFullName ?? c.authorUsername}</span>
              {c.parentCommentId && <span className="text-xs text-muted-foreground">↩ trả lời</span>}
              <span className="text-xs text-muted-foreground ml-auto shrink-0">
                {c.createdAt ? fmt.format(new Date(c.createdAt)) : "—"}
              </span>
            </div>
            <p className="text-sm text-foreground/90 mt-0.5 break-words">
              {c.deleted ? <em className="text-muted-foreground">Đã xóa</em> : c.content}
            </p>
          </div>
          {!c.deleted && (
            <button
              onClick={() => handleDelete(c.id)}
              className="mt-1 shrink-0 cursor-pointer text-muted-foreground transition-colors hover:text-destructive"
              title="Xóa bình luận"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

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
  const [updatingStatus, setUpdatingStatus] = React.useState(false);
  const [deleteDialog, setDeleteDialog] = React.useState(false);

  React.useEffect(() => {
    if (!record?.id) return;
    setStatsLoading(true);
    apiClient.get<PostStats>(`/api/v1/admin/posts/${record.id}/stats`)
      .then(r => setStats(r.data))
      .catch(() => setStats(undefined))
      .finally(() => setStatsLoading(false));
  }, [record?.id]);

  const handleStatusChange = async (status: string) => {
    if (!record) return;
    setUpdatingStatus(true);
    try {
      await update("posts", { id: record.id, data: { status }, previousData: record }, { returnPromise: true });
      notify("Đã cập nhật trạng thái", { type: "success" });
      refresh();
    } catch {
      notify("Cập nhật thất bại", { type: "error" });
    } finally {
      setUpdatingStatus(false);
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-3">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  if (!record) return null;

  const statusCfg = STATUS_CONFIG[record.status] ?? { label: record.status, variant: "outline" as const };
  const privacyMeta = PRIVACY_META[record.privacy] ?? { label: record.privacy, icon: Globe };
  const PrivacyIcon = privacyMeta.icon;

  return (
    <div className="space-y-4 pb-8">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Quay lại danh sách
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Left: Content + Comments ──────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Post content */}
          <Card>
            <CardContent className="pt-5 space-y-4">
              {/* Header row */}
              <div className="flex items-start gap-3">
                <Link to={`/customers/${record.authorId}/show`}>
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={record.authorAvatarUrl} />
                    <AvatarFallback>
                      {(record.authorFullName ?? record.authorUsername ?? "?").charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/customers/${record.authorId}/show`}
                    className="font-semibold text-sm hover:underline"
                  >
                    {record.authorFullName ?? record.authorUsername ?? "—"}
                  </Link>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                    <PrivacyIcon className="h-3 w-3" />
                    <span>{privacyMeta.label}</span>
                    {record.publishedAt && (
                      <>
                        <span>·</span>
                        <Calendar className="h-3 w-3" />
                        <span>{fmt.format(new Date(record.publishedAt))}</span>
                      </>
                    )}
                  </div>
                </div>
                <Badge variant={statusCfg.variant} className="shrink-0">{statusCfg.label}</Badge>
              </div>

              {/* Content text */}
              {record.content ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {record.content}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">Không có nội dung văn bản</p>
              )}

              {/* Image */}
              {record.imageUrl && (
                <img
                  src={record.imageUrl}
                  alt="Ảnh bài đăng"
                  className="rounded-lg max-h-96 w-full object-cover border"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              )}

              {/* Meta tags */}
              <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground pt-1 border-t">
                {record.locationText && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />{record.locationText}
                  </span>
                )}
                {record.promoted && (
                  <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                    <Star className="h-3 w-3" />Promoted
                  </span>
                )}
                {record.scheduledAt && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Lên lịch: {fmt.format(new Date(record.scheduledAt))}
                  </span>
                )}
              </div>

              {/* Stats */}
              <div className="flex gap-2 pt-1">
                <StatChip icon={Heart}        color="text-red-400"    label="Cảm xúc"  value={stats?.reactionCount} loading={statsLoading} />
                <StatChip icon={MessageSquare} color="text-pink-500"  label="Bình luận" value={stats?.commentCount}  loading={statsLoading} />
                <StatChip icon={Share2}        color="text-yellow-500" label="Chia sẻ" value={stats?.shareCount}    loading={statsLoading} />
              </div>
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Bình luận ({fmtNum.format(stats?.commentCount ?? 0)})
                </p>
                <button
                  onClick={() => setCommentRefresh(n => n + 1)}
                  className="cursor-pointer text-xs text-muted-foreground hover:text-foreground"
                >
                  Làm mới
                </button>
              </div>
              <CommentsSection postId={record.id} refresh={commentRefresh} />
            </CardContent>
          </Card>
        </div>

        {/* ── Right: Sidebar ────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Actions */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Thao tác</p>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Trạng thái</label>
                <Select
                  value={record.status}
                  onValueChange={handleStatusChange}
                  disabled={updatingStatus}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PUBLISHED">Hiển thị</SelectItem>
                    <SelectItem value="DRAFT">Bản nháp</SelectItem>
                    <SelectItem value="SCHEDULED">Lên lịch</SelectItem>
                    <SelectItem value="DELETED">Đã xóa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => setDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Xóa vĩnh viễn
              </Button>
            </CardContent>
          </Card>

          {/* Post info */}
          <Card>
            <CardContent className="pt-4 space-y-2.5 text-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Thông tin bài đăng</p>
              <InfoRow label="ID">
                <span className="font-mono text-xs break-all">{record.id}</span>
              </InfoRow>
              <InfoRow label="Tác giả">
                <Link
                  to={`/customers/${record.authorId}/show`}
                  className="hover:underline font-medium"
                >
                  {record.authorFullName ?? record.authorUsername ?? "—"}
                </Link>
              </InfoRow>
              <InfoRow label="Quyền xem">
                <span className="inline-flex items-center gap-1">
                  <PrivacyIcon className="h-3 w-3" /> {privacyMeta.label}
                </span>
              </InfoRow>
              {record.locationText && (
                <InfoRow label="Vị trí">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {record.locationText}
                  </span>
                </InfoRow>
              )}
              {record.promoted && (
                <InfoRow label="Promoted">
                  <span className="inline-flex items-center gap-1 text-amber-600">
                    <Star className="h-3 w-3" /> Có
                  </span>
                </InfoRow>
              )}
              <InfoRow label="Ngày tạo">
                {record.createdAt ? fmt.format(new Date(record.createdAt)) : "—"}
              </InfoRow>
              {record.publishedAt && (
                <InfoRow label="Ngày đăng">
                  {fmt.format(new Date(record.publishedAt))}
                </InfoRow>
              )}
              {record.scheduledAt && (
                <InfoRow label="Lên lịch lúc">
                  {fmt.format(new Date(record.scheduledAt))}
                </InfoRow>
              )}
              <InfoRow label="Cập nhật">
                {record.updatedAt ? fmt.format(new Date(record.updatedAt)) : "—"}
              </InfoRow>
            </CardContent>
          </Card>

          {/* Quick icons */}
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Nhanh</p>
              <div className="grid grid-cols-3 gap-2">
                <QuickStat icon={FileText}  color="text-sky-500"    label="Bài đăng" />
                <QuickStat icon={Eye}       color="text-indigo-400" label="Xem" />
                <QuickStat icon={ShieldAlert} color="text-orange-500" label="Báo cáo" />
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">Tính năng đang phát triển</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete confirm dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa vĩnh viễn bài đăng?</DialogTitle>
            <DialogDescription>
              Hành động này không thể hoàn tác. Bài đăng và toàn bộ dữ liệu liên quan sẽ bị xóa khỏi cơ sở dữ liệu.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(false)}>Huỷ</Button>
            <Button
              variant="destructive"
              onClick={() => { setDeleteDialog(false); handleDelete(); }}
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
    <span className="text-muted-foreground shrink-0">{label}</span>
    <span className="text-right font-medium">{children}</span>
  </div>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const QuickStat = ({ icon: Icon, color, label }: { icon: React.FC<any>; color: string; label: string }) => (
  <div className="flex flex-col items-center gap-1 p-2 rounded bg-muted/40">
    <Icon className={`h-4 w-4 ${color} opacity-60`} />
    <span className="text-xs text-muted-foreground">{label}</span>
  </div>
);
