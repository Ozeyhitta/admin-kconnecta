import * as React from "react";
import { useShowController, useNotify } from "ra-core";
import { useNavigate } from "react-router";
import {
  ShieldCheck, User, FileText, MessageSquare, Heart,
  Share2, UserPlus2, LogIn, Activity, ArrowLeft,
  CheckCircle, XCircle, Lock, KeyRound, Mail, TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/services/axiosInstance";
import { isCurrentAdminUser } from "@/lib/currentAdminUser";
import { LockUserButton } from "./LockUserButton";

interface UserStats {
  totalPosts: number;
  totalComments: number;
  totalReactions: number;
  totalShares: number;
  totalFriendRequests: number;
  totalLogins: number;
  totalActivity: number;
}

interface ActivityLog {
  id: string;
  actionType: string;
  metadata: string;
  createdAt: string;
}

const fmt = new Intl.NumberFormat("vi-VN");

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
});

const statusMeta: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.FC<{ className?: string }> }> = {
  ACTIVE: { label: "Hoạt động", variant: "default", icon: CheckCircle },
  INACTIVE: { label: "Không hoạt động", variant: "secondary", icon: XCircle },
  LOCKED: { label: "Đã khoá", variant: "destructive", icon: Lock },
};

const ACTION_LABELS: Record<string, string> = {
  LOGIN: "Đăng nhập",
  LOGOUT: "Đăng xuất",
  REGISTER: "Đăng ký",
  GOOGLE_LOGIN: "Google login",
  POST_CREATED: "Đăng bài",
  POST_DELETED: "Xóa bài",
  COMMENT_ADDED: "Bình luận",
  REACTION_ADDED: "Cảm xúc",
  POST_SHARED: "Chia sẻ",
  FRIEND_REQUEST_SENT: "Gửi kết bạn",
  FRIEND_ACCEPTED: "Chấp nhận kết bạn",
  PASSWORD_CHANGED: "Đổi mật khẩu",
  RESET_PASSWORD: "Reset mật khẩu",
};

const StatItem = ({
  icon: Icon, iconColor, label, value, loading,
}: {
  icon: React.FC<{ className?: string }>;
  iconColor: string;
  label: string;
  value: number | undefined;
  loading: boolean;
}) => (
  <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted/50 flex-1 min-w-[90px]">
    <Icon className={`h-5 w-5 ${iconColor}`} />
    {loading ? <Skeleton className="h-6 w-10" /> : (
      <span className="text-lg font-bold tabular-nums">{value !== undefined ? fmt.format(value) : "—"}</span>
    )}
    <span className="text-xs text-muted-foreground text-center leading-tight">{label}</span>
  </div>
);

const ResetPasswordDialog = ({
  open, onClose, userId,
}: { open: boolean; onClose: () => void; userId: string }) => {
  const [pw, setPw] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const notify = useNotify();

  const handleSubmit = async () => {
    if (pw.length < 6) {
      notify("Mật khẩu phải có ít nhất 6 ký tự", { type: "warning" });
      return;
    }
    setSaving(true);
    try {
      await apiClient.put(`/api/v1/admin/users/${userId}/password`, { newPassword: pw });
      notify("Đã đặt lại mật khẩu", { type: "success" });
      setPw("");
      onClose();
    } catch {
      notify("Đặt lại mật khẩu thất bại", { type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Đặt lại mật khẩu</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Label htmlFor="new-pw">Mật khẩu mới</Label>
          <Input
            id="new-pw"
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Tối thiểu 6 ký tự"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Huỷ</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Đang lưu…" : "Xác nhận"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const CustomerShow = () => {
  const { record, isLoading } = useShowController();
  const navigate = useNavigate();

  const [stats, setStats] = React.useState<UserStats | undefined>();
  const [statsLoading, setStatsLoading] = React.useState(true);
  const [activity, setActivity] = React.useState<ActivityLog[]>([]);
  const [activityLoading, setActivityLoading] = React.useState(true);
  const [pwDialog, setPwDialog] = React.useState(false);

  React.useEffect(() => {
    if (!record?.id) return;
    setStatsLoading(true);
    setActivityLoading(true);

    apiClient.get<UserStats>(`/api/v1/admin/users/${record.id}/stats`)
      .then((r) => setStats(r.data))
      .catch(() => setStats(undefined))
      .finally(() => setStatsLoading(false));

    apiClient.get<ActivityLog[]>(`/api/v1/admin/users/${record.id}/activity`)
      .then((r) => setActivity(r.data))
      .catch(() => setActivity([]))
      .finally(() => setActivityLoading(false));
  }, [record?.id]);

  const isSelfAccount = isCurrentAdminUser(record);

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!record) return null;

  const status = statusMeta[record.status] ?? { label: record.status, variant: "outline" as const, icon: User };

  return (
    <div className="space-y-4 pb-8">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Quay lại danh sách
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6 flex flex-col items-center text-center gap-3">
              <Avatar className="w-20 h-20">
                <AvatarImage src={record.avatarUrl} />
                <AvatarFallback className="text-2xl">
                  {record.fullName?.charAt(0) ?? record.username?.charAt(0) ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-lg font-semibold">{record.fullName ?? "—"}</p>
                {record.username && (
                  <p className="text-sm text-muted-foreground">@{record.username}</p>
                )}
                <p className="text-sm text-muted-foreground mt-0.5">{record.email}</p>
              </div>
              <div className="flex gap-2 flex-wrap justify-center">
                <Badge variant={status.variant}>
                  <status.icon className="h-3 w-3 mr-1" />
                  {status.label}
                </Badge>
                <Badge variant={record.role === "ADMIN" ? "default" : "outline"}>
                  {record.role === "ADMIN"
                    ? <ShieldCheck className="h-3 w-3 mr-1" />
                    : <User className="h-3 w-3 mr-1" />}
                  {record.role}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 space-y-3 text-sm">
              <DetailRow
                label="Trạng thái"
                value={
                  <Badge variant={status.variant}>
                    <status.icon className="h-3 w-3 mr-1" />
                    {status.label}
                  </Badge>
                }
              />
              <DetailRow
                label="Vai trò"
                value={
                  <Badge variant={record.role === "ADMIN" ? "default" : "outline"}>
                    {record.role === "ADMIN"
                      ? <ShieldCheck className="h-3 w-3 mr-1" />
                      : <User className="h-3 w-3 mr-1" />}
                    {record.role ?? "—"}
                  </Badge>
                }
              />
              <DetailRow label="Ngày tham gia" value={record.createdAt ? dateFormatter.format(new Date(record.createdAt)) : "—"} />
              <DetailRow label="Hoạt động cuối" value={record.lastActiveAt ? dateFormatter.format(new Date(record.lastActiveAt)) : "Chưa có"} />
              <DetailRow label="ID" value={<span className="font-mono text-xs break-all">{record.id}</span>} />
            </CardContent>
          </Card>

          {!isSelfAccount ? (
            <Card>
              <CardContent className="pt-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Thao tác</p>
                <LockUserButton record={record} className="w-full" />
                <Button variant="outline" size="sm" className="w-full" onClick={() => setPwDialog(true)}>
                  <KeyRound className="h-4 w-4 mr-2" />
                  Đặt lại mật khẩu
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">
                  Đây là tài khoản của bạn — không thể tự khóa hoặc đặt lại mật khẩu tại đây.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Thống kê hoạt động
              </p>
              <div className="flex flex-wrap gap-2">
                <StatItem icon={FileText} iconColor="text-sky-500" label="Bài đăng" value={stats?.totalPosts} loading={statsLoading} />
                <StatItem icon={MessageSquare} iconColor="text-pink-500" label="Bình luận" value={stats?.totalComments} loading={statsLoading} />
                <StatItem icon={Heart} iconColor="text-red-400" label="Cảm xúc" value={stats?.totalReactions} loading={statsLoading} />
                <StatItem icon={Share2} iconColor="text-yellow-500" label="Chia sẻ" value={stats?.totalShares} loading={statsLoading} />
                <StatItem icon={UserPlus2} iconColor="text-emerald-500" label="Kết bạn" value={stats?.totalFriendRequests} loading={statsLoading} />
                <StatItem icon={LogIn} iconColor="text-indigo-500" label="Đăng nhập" value={stats?.totalLogins} loading={statsLoading} />
                <StatItem icon={Activity} iconColor="text-orange-500" label="Tổng HĐ" value={stats?.totalActivity} loading={statsLoading} />
                <StatItem
                  icon={TrendingUp}
                  iconColor="text-violet-500"
                  label="Engagement"
                  value={
                    stats && stats.totalActivity > 0
                      ? Math.round(((stats.totalReactions + stats.totalComments + stats.totalShares) / Math.max(stats.totalPosts, 1)) * 10) / 10
                      : 0
                  }
                  loading={statsLoading}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Hoạt động gần đây (15 mới nhất)
              </p>
              {activityLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-full" />
                  ))}
                </div>
              ) : activity.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Chưa có hoạt động nào</p>
              ) : (
                <div className="divide-y rounded-md border overflow-hidden">
                  {activity.map((log) => (
                    <div key={log.id} className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/40">
                      <Badge variant="outline" className="shrink-0 text-xs px-2 py-0 font-normal">
                        {ACTION_LABELS[log.actionType] ?? log.actionType}
                      </Badge>
                      {log.metadata && (
                        <span className="text-muted-foreground text-xs truncate flex-1 hidden sm:block">
                          {log.metadata}
                        </span>
                      )}
                      <span className="text-muted-foreground text-xs shrink-0 ml-auto">
                        {log.createdAt ? dateFormatter.format(new Date(log.createdAt)) : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {!isSelfAccount && (
        <ResetPasswordDialog
          open={pwDialog}
          onClose={() => setPwDialog(false)}
          userId={record.id}
        />
      )}
    </div>
  );
};

const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between gap-2">
    <span className="text-muted-foreground shrink-0">{label}</span>
    <span className="font-medium text-right">{value}</span>
  </div>
);
