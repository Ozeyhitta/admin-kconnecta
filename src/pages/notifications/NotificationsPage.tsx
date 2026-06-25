import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { AlertTriangle, Clock, RefreshCw, Send, Users, User, X, Search, Flag, Video, Bell } from "lucide-react";
import { useNotify } from "ra-core";
import { Breadcrumb, BreadcrumbPage } from "@/components/admin";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiClient } from "@/services/axiosInstance";
import { getPageContent, getPageTotal } from "@/services/pagination";
import { markAdminInboxSeen } from "@/lib/adminInboxSeen";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PickedUser {
  id: string;
  fullName: string | null;
  username: string | null;
  avatarUrl?: string;
  email?: string;
}

const displayName = (u: PickedUser) => u.fullName ?? u.username ?? "?";
const notificationTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
});

interface AccountReviewRequest {
  id: string;
  userId: string;
  username?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  description?: string | null;
  metadata?: string | null;
  createdAt?: string | null;
}

const reviewDisplayName = (item: AccountReviewRequest) =>
  item.fullName || item.username || "Người dùng";

interface PostReportNotification {
  id: string;
  postId?: string | null;
  reporterId?: string | null;
  reporterUsername?: string | null;
  reporterFullName?: string | null;
  reporterAvatarUrl?: string | null;
  postAuthorFullName?: string | null;
  reason?: string | null;
  summary?: string | null;
  createdAt?: string | null;
}

const reportDisplayName = (item: PostReportNotification) =>
  item.reporterFullName || item.reporterUsername || "Người dùng";

const isWatchVideoReport = (item: PostReportNotification) =>
  (item.reason ?? "").includes("watch") || (item.summary ?? "").includes("video");

// ─── User Picker Dialog ───────────────────────────────────────────────────────

interface UserPickerDialogProps {
  open: boolean;
  onClose: () => void;
  initial: PickedUser[];
  onConfirm: (users: PickedUser[]) => void;
}

const PAGE_SIZE = 10;

const UserPickerDialog = ({ open, onClose, initial, onConfirm }: UserPickerDialogProps) => {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<PickedUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<PickedUser[]>(initial);

  useEffect(() => {
    if (open) {
      setSelected(initial);
      setSearch("");
      setPage(0);
      setUsers([]);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await apiClient.get("/api/v1/admin/users", {
          params: { search: search || undefined, size: PAGE_SIZE, page },
        });
        const content = getPageContent<PickedUser>(data);
        setUsers((prev) => (page === 0 ? content : [...prev, ...content]));
        setTotal(getPageTotal(data, content.length));
      } catch {
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [open, search, page]);

  useEffect(() => {
    setPage(0);
    setUsers([]);
  }, [search]);

  const toggle = (user: PickedUser) => {
    setSelected((prev) =>
      prev.some((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    );
  };

  const isSelected = (id: string) => selected.some((u) => u.id === id);
  const hasMore = users.length < total;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-md p-0 gap-0 overflow-hidden"
        aria-describedby={undefined}
      >
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <User className="size-4" />
            Chọn người dùng
          </DialogTitle>

          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Tìm theo tên, username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              autoComplete="off"
            />
          </div>
        </DialogHeader>

        {/* Selected chips */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-5 pb-3">
            {selected.map((u) => (
              <span
                key={u.id}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
              >
                {displayName(u)}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={() => toggle(u)}
                  onKeyDown={(e) => e.key === "Enter" && toggle(u)}
                  className="hover:text-destructive transition-colors cursor-pointer"
                >
                  <X className="size-3" />
                </span>
              </span>
            ))}
          </div>
        )}

        {/* User list */}
        <div className="overflow-y-auto max-h-72 border-t border-border divide-y divide-border">
          {loading && users.length === 0 ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3">
                <Skeleton className="size-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))
          ) : users.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Không tìm thấy người dùng
            </div>
          ) : (
            <>
              {users.map((u) => (
                <div
                  key={u.id}
                  onClick={() => toggle(u)}
                  className="flex items-center gap-3 w-full px-5 py-3 hover:bg-muted/50 transition-colors cursor-pointer select-none"
                >
                  <Checkbox
                    checked={isSelected(u.id)}
                    onCheckedChange={() => toggle(u)}
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0"
                  />
                  <Avatar className="size-9 shrink-0">
                    <AvatarImage src={u.avatarUrl} />
                    <AvatarFallback className="text-xs">
                      {displayName(u).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start min-w-0">
                    <span className="text-sm font-medium truncate">{displayName(u)}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {u.username ? `@${u.username}` : (u.email ?? "")}
                    </span>
                  </div>
                </div>
              ))}
              {hasMore && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setPage((p) => p + 1)}
                  onKeyDown={(e) => e.key === "Enter" && setPage((p) => p + 1)}
                  className={`w-full py-2.5 text-xs text-primary text-center hover:bg-muted/50 transition-colors cursor-pointer ${loading ? "opacity-50 pointer-events-none" : ""}`}
                >
                  {loading ? "Đang tải..." : `Tải thêm (còn ${total - users.length})`}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="px-5 py-4 border-t border-border">
          <span className="text-sm text-muted-foreground mr-auto">
            Đã chọn: <strong>{selected.length}</strong> người dùng
          </span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Hủy
          </Button>
          <Button size="sm" onClick={() => { onConfirm(selected); onClose(); }}>
            Xác nhận
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const notify = useNotify();
  const navigate = useNavigate();
  const [targetType, setTargetType] = useState<"all" | "specific">("all");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<PickedUser[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [reviewRequests, setReviewRequests] = useState<AccountReviewRequest[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [postReports, setPostReports] = useState<PostReportNotification[]>([]);
  const [postReportsLoading, setPostReportsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"review" | "reports">("review");

  const loadReviewRequests = async () => {
    setReviewLoading(true);
    try {
      const { data } = await apiClient.get<AccountReviewRequest[]>(
        "/api/v1/admin/notifications/account-review-requests",
        { params: { size: 8 } },
      );
      setReviewRequests(Array.isArray(data) ? data : []);
    } catch {
      setReviewRequests([]);
    } finally {
      setReviewLoading(false);
    }
  };

  const loadPostReports = async () => {
    setPostReportsLoading(true);
    try {
      const { data } = await apiClient.get<PostReportNotification[]>(
        "/api/v1/admin/notifications/post-report-requests",
        { params: { size: 8 } },
      );
      setPostReports(Array.isArray(data) ? data : []);
    } catch {
      setPostReports([]);
    } finally {
      setPostReportsLoading(false);
    }
  };

  const loadInbox = async () => {
    await Promise.all([loadReviewRequests(), loadPostReports()]);
  };

  useEffect(() => {
    markAdminInboxSeen();
    void loadInbox();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = async () => {
    if (!message.trim()) return;
    if (targetType === "specific" && selectedUsers.length === 0) return;

    setSending(true);
    try {
      if (targetType === "all") {
        await apiClient.post("/api/v1/admin/notifications/broadcast", { text: message });
        notify("Đã gửi thông báo đến tất cả người dùng", {
          type: "success",
          messageArgs: { _: "Đã gửi thông báo đến tất cả người dùng" },
        });
      } else {
        if (selectedUsers.length === 1) {
          await apiClient.post("/api/v1/admin/notifications/send", {
            targetUserId: selectedUsers[0].id,
            text: message,
          });
        } else {
          await apiClient.post("/api/v1/admin/notifications/send-batch", {
            targetUserIds: selectedUsers.map((u) => u.id),
            text: message,
          });
        }
        const successMsg =
          selectedUsers.length === 1
            ? `Đã gửi thông báo đến ${displayName(selectedUsers[0])}`
            : `Đã gửi thông báo đến ${selectedUsers.length} người dùng`;
        notify(successMsg, { type: "success", messageArgs: { _: successMsg } });
      }
      setMessage("");
      setSelectedUsers([]);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string } } };
      const status = axiosErr.response?.status;
      const msg =
        status === 401
          ? "Phiên đăng nhập hết hạn hoặc token không hợp lệ — đăng xuất và đăng nhập lại"
          : axiosErr.response?.data?.message ?? "Gửi thông báo thất bại";
      notify(msg, {
        type: "error",
        messageArgs: { _: msg },
      });
    } finally {
      setSending(false);
    }
  };

  const removeUser = (id: string) =>
    setSelectedUsers((prev) => prev.filter((u) => u.id !== id));

  const canSend =
    message.trim().length > 0 &&
    (targetType === "all" || selectedUsers.length > 0);

  return (
    <>
      <Breadcrumb>
        <BreadcrumbPage>Thông báo</BreadcrumbPage>
      </Breadcrumb>

      {/* Header + summary */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <Bell className="size-5" />
          Thông báo
        </h1>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
            <AlertTriangle className="size-3.5" />
            {reviewRequests.length} chờ xử lý
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300">
            <Flag className="size-3.5" />
            {postReports.length} báo cáo
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
        {/* ─── Left: triage inbox ─── */}
        <div className="rounded-lg border border-border bg-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Hộp thư xử lý</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadInbox()}
              disabled={reviewLoading || postReportsLoading}
            >
              <RefreshCw className={`size-4 mr-1.5 ${reviewLoading || postReportsLoading ? "animate-spin" : ""}`} />
              Làm mới
            </Button>
          </div>

          {/* Tabs */}
          <div className="mb-4 flex gap-1.5 rounded-lg bg-muted p-1">
            <button
              onClick={() => setActiveTab("review")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === "review"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <AlertTriangle className="size-4 text-amber-500" />
              Yêu cầu xem xét
              <span className="rounded-full bg-amber-100 px-1.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                {reviewRequests.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("reports")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === "reports"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Flag className="size-4 text-red-500" />
              Báo cáo bài viết
              <span className="rounded-full bg-red-100 px-1.5 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">
                {postReports.length}
              </span>
            </button>
          </div>

          {/* Review panel */}
          {activeTab === "review" &&
            (reviewLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <Skeleton className="size-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : reviewRequests.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Chưa có yêu cầu xem xét mở khóa nào từ người dùng.
              </div>
            ) : (
              <div className="space-y-3">
                {reviewRequests.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-3">
                    <Avatar className="size-10 shrink-0">
                      <AvatarImage src={item.avatarUrl ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {reviewDisplayName(item).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{reviewDisplayName(item)}</p>
                        {item.username && <span className="text-xs text-muted-foreground">@{item.username}</span>}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.description || "Người dùng yêu cầu admin xem xét mở khóa tài khoản."}
                      </p>
                      {item.createdAt && (
                        <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="size-3" />
                          {notificationTimeFormatter.format(new Date(item.createdAt))}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/customers/${item.userId}/show`)}
                    >
                      Xem tài khoản
                    </Button>
                  </div>
                ))}
              </div>
            ))}

          {/* Reports panel */}
          {activeTab === "reports" &&
            (postReportsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <Skeleton className="size-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : postReports.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Chưa có báo cáo video hoặc bài viết nào từ người dùng.
              </div>
            ) : (
              <div className="space-y-3">
                {postReports.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-3">
                    <Avatar className="size-10 shrink-0">
                      <AvatarImage src={item.reporterAvatarUrl ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {reportDisplayName(item).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{reportDisplayName(item)}</p>
                        {item.reporterUsername && (
                          <span className="text-xs text-muted-foreground">@{item.reporterUsername}</span>
                        )}
                        {isWatchVideoReport(item) && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">
                            <Video className="size-3" />
                            Video Watch
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.summary || item.reason || "Người dùng báo cáo nội dung."}
                      </p>
                      {item.postAuthorFullName && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Tác giả bài viết: {item.postAuthorFullName}
                        </p>
                      )}
                      {item.createdAt && (
                        <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="size-3" />
                          {notificationTimeFormatter.format(new Date(item.createdAt))}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col gap-2">
                      {item.postId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/posts/${item.postId}/show`)}
                        >
                          Xem bài
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => navigate("/post-reports")}>
                        Tất cả báo cáo
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
        </div>

        {/* ─── Right: compose (sticky) ─── */}
        <div className="rounded-lg border border-border bg-card p-5 lg:sticky lg:top-4">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Send className="size-4" />
            Gửi thông báo
          </h2>

          {/* Target type */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => { setTargetType("all"); setSelectedUsers([]); }}
              className={`flex flex-1 items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                targetType === "all"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-muted text-muted-foreground"
              }`}
            >
              <Users className="size-4" />
              Tất cả
            </button>
            <button
              onClick={() => setTargetType("specific")}
              className={`flex flex-1 items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                targetType === "specific"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-muted text-muted-foreground"
              }`}
            >
              <User className="size-4" />
              Cụ thể
            </button>
          </div>

          {/* User picker */}
          {targetType === "specific" && (
            <div className="mb-4">
              <Label className="text-sm mb-1.5 block">Người nhận</Label>

              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {selectedUsers.map((u) => (
                    <span
                      key={u.id}
                      className="flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
                    >
                      <Avatar className="size-4 shrink-0">
                        <AvatarImage src={u.avatarUrl} />
                        <AvatarFallback className="text-[10px]">
                          {displayName(u).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {displayName(u)}
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={() => removeUser(u.id)}
                        onKeyDown={(e) => e.key === "Enter" && removeUser(u.id)}
                        className="hover:text-destructive transition-colors cursor-pointer ml-0.5"
                      >
                        <X className="size-3" />
                      </span>
                    </span>
                  ))}
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPickerOpen(true)}
                className="w-full justify-start gap-2 text-muted-foreground"
              >
                <Users className="size-4" />
                {selectedUsers.length === 0
                  ? "Chọn người dùng..."
                  : `Thêm / bỏ người dùng (${selectedUsers.length} đã chọn)`}
              </Button>
            </div>
          )}

          {/* Message */}
          <div className="mb-4">
            <Label className="text-sm mb-1.5 block">Nội dung thông báo</Label>
            <Textarea
              placeholder="Nhập nội dung thông báo..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          <Button onClick={handleSend} disabled={sending || !canSend} className="w-full">
            <Send className="size-4 mr-1.5" />
            {sending ? "Đang gửi..." : "Gửi thông báo"}
          </Button>
        </div>
      </div>

      <UserPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        initial={selectedUsers}
        onConfirm={setSelectedUsers}
      />
    </>
  );
}
