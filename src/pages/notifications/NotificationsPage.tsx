import { useEffect, useState } from "react";
import { Send, Users, User, X, Search } from "lucide-react";
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
import { getAdminToken } from "@/lib/currentAdminUser";
import { adminPost, AdminApiError } from "@/services/adminApi";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PickedUser {
  id: string;
  fullName: string | null;
  username: string | null;
  avatarUrl?: string;
  email?: string;
}

const displayName = (u: PickedUser) => u.fullName ?? u.username ?? "?";

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
        const content: PickedUser[] = data.content ?? [];
        setUsers((prev) => (page === 0 ? content : [...prev, ...content]));
        setTotal(data.totalElements ?? 0);
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
  const [targetType, setTargetType] = useState<"all" | "specific">("all");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<PickedUser[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;
    if (targetType === "specific" && selectedUsers.length === 0) return;

    const token = getAdminToken();
    if (!token) {
      notify("Phiên đăng nhập hết hạn — vui lòng đăng nhập lại", {
        type: "warning",
        messageArgs: { _: "Phiên đăng nhập hết hạn — vui lòng đăng nhập lại" },
      });
      return;
    }

    setSending(true);
    try {
      if (targetType === "all") {
        await adminPost("/api/v1/admin/notifications/broadcast", { text: message });
        notify("Đã gửi thông báo đến tất cả người dùng", {
          type: "success",
          messageArgs: { _: "Đã gửi thông báo đến tất cả người dùng" },
        });
      } else {
        if (selectedUsers.length === 1) {
          await adminPost("/api/v1/admin/notifications/send", {
            targetUserId: selectedUsers[0].id,
            text: message,
          });
        } else {
          await adminPost("/api/v1/admin/notifications/send-batch", {
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
      const msg =
        err instanceof AdminApiError
          ? err.status === 401
            ? "Phiên đăng nhập hết hạn hoặc token không hợp lệ — đăng xuất và đăng nhập lại"
            : err.message
          : "Gửi thông báo thất bại";
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

      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
          <Send className="size-4" />
          Gửi thông báo đến người dùng
        </h2>

        {/* Target type */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setTargetType("all"); setSelectedUsers([]); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
              targetType === "all"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:bg-muted text-muted-foreground"
            }`}
          >
            <Users className="size-4" />
            Tất cả người dùng
          </button>
          <button
            onClick={() => setTargetType("specific")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
              targetType === "specific"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:bg-muted text-muted-foreground"
            }`}
          >
            <User className="size-4" />
            Người dùng cụ thể
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
            rows={3}
            className="resize-none"
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSend} disabled={sending || !canSend}>
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
