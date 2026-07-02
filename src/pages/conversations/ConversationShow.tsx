import { useShowController, useNotify, useRefresh, usePermissions } from "ra-core";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, CheckCheck, Trash2, EyeOff, Unlock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatChatMessagePreview } from "@/lib/chatMessagePreview";
import { apiClient } from "@/services/axiosInstance";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
});

type ChatUser = {
  id: string;
  username?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
};

type ChatMessage = {
  id: string;
  senderId: string;
  senderUsername?: string | null;
  senderFullName?: string | null;
  senderAvatarUrl?: string | null;
  content?: string | null;
  createdAt?: string | null;
  delivered: boolean;
  seen: boolean;
  deleted: boolean;
  status: string; // ACTIVE, HIDDEN, DELETED
};

type ConversationSummary = {
  user1Id?: string;
  user1Username?: string | null;
  user1FullName?: string | null;
  user1AvatarUrl?: string | null;
  user2Id?: string;
  user2Username?: string | null;
  user2FullName?: string | null;
  user2AvatarUrl?: string | null;
  messageCount?: number;
  unreadCount?: number;
  status?: string;
  reportCount?: number;
};

type ConversationDetail = ConversationSummary & {
  id: string;
  summary?: ConversationSummary;
  messages?: ChatMessage[];
  totalMessages?: number;
};

type AuditLog = {
  id: string;
  adminId: string;
  action: string;
  conversationId: string;
  messageId?: string | null;
  targetUserId?: string | null;
  reason?: string | null;
  createdAt: string;
};

const userName = (user: Pick<ChatUser, "fullName" | "username">) =>
  user.fullName ?? user.username ?? "Người dùng";

const ParticipantCard = ({ user }: { user: ChatUser }) => {
  const name = userName(user);
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <Avatar className="h-10 w-10">
          <AvatarImage src={user.avatarUrl ?? undefined} />
          <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="truncate font-medium">{name}</div>
          {user.username ? (
            <div className="truncate text-sm text-muted-foreground">@{user.username}</div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};

export const ConversationShow = () => {
  const { record, isPending } = useShowController<ConversationDetail>();
  const { permissions: role } = usePermissions();
  const navigate = useNavigate();
  const notify = useNotify();
  const refresh = useRefresh();

  const isSuperAdmin = role === "SUPER_ADMIN";

  // Messages Pagination State
  const [msgPage, setMsgPage] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [totalMessages, setTotalMessages] = useState(0);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Tab & Audit Logs State
  const [activeTab, setActiveTab] = useState<"chat" | "audit">("chat");
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // Action Reason Modal State
  const [reasonModal, setReasonModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    placeholder?: string;
    onConfirm: (reason: string) => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: async () => {},
  });
  const [modalReasonInput, setModalReasonInput] = useState("");

  // Load paginated messages
  const fetchMessages = (opts: { silent?: boolean } = {}) => {
    if (!record?.id) return;
    if (!opts.silent) setIsLoadingMessages(true);
    apiClient
      .get(`/api/v1/admin/conversations/${record.id}`, {
        params: { msgPage, msgSize: 20 },
      })
      .then((res) => {
        setMessages(res.data.messages || []);
        setTotalMessages(res.data.totalMessages || 0);
      })
      .catch(() => {
        if (!opts.silent) notify("Lỗi khi tải lịch sử tin nhắn", { type: "error" });
      })
      .finally(() => {
        if (!opts.silent) setIsLoadingMessages(false);
      });
  };

  useEffect(() => {
    fetchMessages();
  }, [record?.id, msgPage, refresh]);

  // Poll for realtime updates (new messages, user-recalled/admin-moderated status changes)
  // while the chat tab is open, without requiring a manual page refresh.
  useEffect(() => {
    if (!record?.id || activeTab !== "chat") return;
    const interval = setInterval(() => fetchMessages({ silent: true }), 4000);
    return () => clearInterval(interval);
  }, [record?.id, msgPage, activeTab]);

  // Load audit logs if Super Admin and tab active
  useEffect(() => {
    if (record?.id && activeTab === "audit" && isSuperAdmin) {
      setIsLoadingAudit(true);
      apiClient
        .get("/api/v1/admin/conversations/audit-logs", {
          params: { conversationId: record.id },
        })
        .then((res) => {
          setAuditLogs(res.data || []);
        })
        .catch(() => {
          notify("Lỗi khi tải nhật ký kiểm duyệt", { type: "error" });
        })
        .finally(() => {
          setIsLoadingAudit(false);
        });
    }
  }, [record?.id, activeTab, isSuperAdmin, refresh]);

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!record) return null;

  const summary = record.summary ?? record;
  const conversationStatus = summary.status ?? "ACTIVE";

  if (!summary.user1Id || !summary.user2Id) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/conversations">
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Link>
        </Button>
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Không tìm thấy dữ liệu chi tiết cuộc hội thoại.
          </CardContent>
        </Card>
      </div>
    );
  }

  const user1: ChatUser = {
    id: summary.user1Id,
    username: summary.user1Username,
    fullName: summary.user1FullName,
    avatarUrl: summary.user1AvatarUrl,
  };
  const user2: ChatUser = {
    id: summary.user2Id,
    username: summary.user2Username,
    fullName: summary.user2FullName,
    avatarUrl: summary.user2AvatarUrl,
  };

  // Unlock a legacy LOCKED conversation (locking is no longer supported, only cleanup of old data)
  const handleUnlockConversation = () => {
    setModalReasonInput("");
    setReasonModal({
      isOpen: true,
      title: "Xác nhận mở khóa cuộc hội thoại",
      description: "Vui lòng nhập lý do để mở khóa cuộc hội thoại này:",
      placeholder: "Nhập lý do mở khóa hội thoại...",
      onConfirm: async (reason) => {
        await apiClient.patch(`/api/v1/admin/conversations/${record.id}/status`, {
          status: "ACTIVE",
          reason,
        });
        notify("Đã mở khóa cuộc hội thoại thành công", { type: "info" });
        refresh();
      },
    });
  };

  // Permanent Hard Delete (Super Admin only)
  const handleHardDeleteConversation = () => {
    if (!isSuperAdmin) {
      notify("Chỉ Super Admin được phép thực hiện hành động này", { type: "error" });
      return;
    }

    setModalReasonInput("");
    setReasonModal({
      isOpen: true,
      title: "Xác nhận xóa vĩnh viễn cuộc hội thoại",
      description: "CẢNH BÁO: Hành động này sẽ xóa vĩnh viễn toàn bộ tin nhắn của cuộc trò chuyện này khỏi cơ sở dữ liệu! Vui lòng nhập lý do xóa vĩnh viễn:",
      placeholder: "Nhập lý do xóa vĩnh viễn cuộc hội thoại...",
      onConfirm: async (reason) => {
        await apiClient.patch(`/api/v1/admin/conversations/${record.id}/status`, {
          status: "DELETED_PERMANENTLY",
          reason,
        });
        notify("Đã xóa vĩnh viễn cuộc hội thoại thành công", { type: "info" });
        navigate("/conversations");
      },
    });
  };

  // Moderate Message (Hide, Soft Delete, Hard Delete)
  const handleModerateMessage = (messageId: string, status: "HIDDEN" | "DELETED" | "DELETED_PERMANENTLY") => {
    let actionLabel = "";
    if (status === "HIDDEN") actionLabel = "ẩn";
    else if (status === "DELETED") actionLabel = "xóa mềm";
    else actionLabel = "xóa vĩnh viễn";

    setModalReasonInput("");
    setReasonModal({
      isOpen: true,
      title: `Xác nhận ${actionLabel} tin nhắn`,
      description: `Vui lòng nhập lý do để ${actionLabel} tin nhắn này:`,
      placeholder: `Nhập lý do ${actionLabel} tin nhắn...`,
      onConfirm: async (reason) => {
        await apiClient.patch(`/api/v1/admin/conversations/${record.id}/messages/${messageId}/status`, {
          status,
          reason,
        });
        notify(`Đã ${actionLabel} tin nhắn thành công`, { type: "info" });
        refresh();
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/conversations">
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          {summary.reportCount && summary.reportCount > 0 ? (
            <Badge variant="destructive" className="mr-2 animate-pulse">
              Bị báo cáo ({summary.reportCount})
            </Badge>
          ) : null}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mr-2">
            <Badge variant="outline">{conversationStatus === "LOCKED" ? "Đã khóa" : "Đang hoạt động"}</Badge>
          </div>

          {conversationStatus === "LOCKED" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleUnlockConversation}
              className="flex items-center gap-1.5"
            >
              <Unlock className="h-4 w-4" />
              Mở khóa hội thoại
            </Button>
          )}

          {isSuperAdmin && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleHardDeleteConversation}
              className="flex items-center gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              Xóa vĩnh viễn
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <ParticipantCard user={user1} />
        <ParticipantCard user={user2} />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab("chat")}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === "chat"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Lịch sử trò chuyện ({totalMessages})
            </button>
            {isSuperAdmin && (
              <button
                onClick={() => setActiveTab("audit")}
                className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === "audit"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Nhật ký kiểm duyệt (Audit Logs)
              </button>
            )}
          </div>

          {activeTab === "chat" && (
            <>
              <div className="divide-y">
                {isLoadingMessages ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    Đang tải lịch sử trò chuyện...
                  </div>
                ) : messages.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">
                    Chưa có tin nhắn
                  </p>
                ) : (
                  messages.map((message) => {
                    const senderName = message.senderFullName ?? message.senderUsername ?? "Người dùng";
                    const isAdminDeleted = message.status === "DELETED";
                    const isUserRecalled = message.deleted && !isAdminDeleted;
                    const isMsgDeleted = isAdminDeleted || isUserRecalled;
                    const isMsgHidden = message.status === "HIDDEN";

                    return (
                      <div key={message.id} className="flex gap-3 p-4 group relative hover:bg-muted/30">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={message.senderAvatarUrl ?? undefined} />
                          <AvatarFallback className="text-xs">
                            {senderName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="font-medium">{senderName}</span>
                            {message.senderUsername ? (
                              <span className="text-xs text-muted-foreground">@{message.senderUsername}</span>
                            ) : null}
                            <span className="ml-auto text-xs text-muted-foreground pr-24">
                              {message.createdAt ? dateFormatter.format(new Date(message.createdAt)) : "-"}
                            </span>
                          </div>
                          <p className="mt-1 whitespace-pre-wrap break-words text-sm pr-24">
                            {isAdminDeleted ? (
                              <span className="italic text-destructive/80 font-medium">[Tin nhắn đã bị xóa bởi Admin]</span>
                            ) : isUserRecalled ? (
                              <span className="italic text-muted-foreground">{formatChatMessagePreview(message.content) || "Tin nhắn đã được thu hồi"}</span>
                            ) : isMsgHidden ? (
                              isSuperAdmin ? (
                                <span className="space-y-1 block">
                                  <span className="italic text-amber-500 font-medium block">[Tin nhắn đã bị ẩn bởi Admin]</span>
                                  <span className="text-muted-foreground text-xs block bg-muted p-1.5 rounded border">
                                    Nội dung gốc (Chỉ Super Admin thấy): {formatChatMessagePreview(message.content)}
                                  </span>
                                </span>
                              ) : (
                                <span className="italic text-amber-500 font-medium">[Tin nhắn đã bị ẩn bởi Admin]</span>
                              )
                            ) : (
                              formatChatMessagePreview(message.content) || "Không có nội dung"
                            )}
                          </p>
                          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                            {message.delivered ? (
                              <span className="inline-flex items-center gap-1">
                                <CheckCheck className="h-3 w-3" />
                                Đã gửi
                              </span>
                            ) : null}
                            {message.seen ? <span>Đã xem</span> : <span>Chưa xem</span>}
                            {message.status && message.status !== "ACTIVE" && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1 border-amber-500/30 text-amber-600 bg-amber-500/5">
                                {message.status}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Message Actions */}
                        {!isMsgDeleted && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!isMsgHidden && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleModerateMessage(message.id, "HIDDEN")}
                                className="h-8 w-8 text-amber-500 hover:bg-amber-500/10 hover:text-amber-600"
                                title="Ẩn tin nhắn này"
                              >
                                <EyeOff className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleModerateMessage(message.id, "DELETED")}
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              title="Xóa mềm tin nhắn"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            {isSuperAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleModerateMessage(message.id, "DELETED_PERMANENTLY")}
                                className="h-8 w-8 text-red-700 hover:bg-red-700/10 hover:text-red-700"
                                title="XÓA VĨNH VIỄN TIN NHẮN KHỎI DB"
                              >
                                <ShieldAlert className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Message Pagination controls */}
              <div className="flex items-center justify-between p-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={msgPage === 0 || isLoadingMessages}
                  onClick={() => setMsgPage((p) => p - 1)}
                >
                  Trang trước
                </Button>
                <span className="text-sm text-muted-foreground">
                  Trang {msgPage + 1} / {Math.ceil(totalMessages / 20) || 1} ({totalMessages} tin nhắn)
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(msgPage + 1) * 20 >= totalMessages || isLoadingMessages}
                  onClick={() => setMsgPage((p) => p + 1)}
                >
                  Trang sau
                </Button>
              </div>
            </>
          )}

          {activeTab === "audit" && isSuperAdmin && (
            <div className="p-4">
              {isLoadingAudit ? (
                <div className="text-center p-6 text-sm text-muted-foreground">
                  Đang tải nhật ký kiểm duyệt...
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center p-6 text-sm text-muted-foreground">
                  Chưa có lịch sử kiểm duyệt nào cho cuộc hội thoại này.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/50 text-muted-foreground font-medium">
                        <th className="p-3">Thời gian</th>
                        <th className="p-3">Quản trị viên</th>
                        <th className="p-3">Hành động</th>
                        <th className="p-3">Lý do / Mô tả</th>
                        <th className="p-3">ID Tin nhắn</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-muted/10">
                          <td className="p-3 text-xs">
                            {dateFormatter.format(new Date(log.createdAt))}
                          </td>
                          <td className="p-3 font-medium text-xs">{log.adminId}</td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-xs">
                              {log.action}
                            </Badge>
                          </td>
                          <td className="p-3 text-xs max-w-xs truncate" title={log.reason || ""}>
                            {log.reason || "—"}
                          </td>
                          <td className="p-3 text-xs font-mono text-muted-foreground">
                            {log.messageId ? log.messageId.substring(0, 8) + "..." : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={reasonModal.isOpen} onOpenChange={(open) => setReasonModal(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="sm:max-w-md bg-card border border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              {reasonModal.title}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground pt-1">
              {reasonModal.description}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="action-reason" className="text-sm font-medium">Lý do thực hiện <span className="text-destructive">*</span></Label>
            <Textarea
              id="action-reason"
              placeholder={reasonModal.placeholder || "Vui lòng nhập lý do cụ thể..."}
              value={modalReasonInput}
              onChange={(e) => setModalReasonInput(e.target.value)}
              className="min-h-[100px] resize-none border-input focus-visible:ring-primary focus-visible:border-primary bg-background/50"
            />
          </div>
          <DialogFooter className="flex sm:justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setReasonModal(prev => ({ ...prev, isOpen: false }))}
              className="cursor-pointer"
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!modalReasonInput.trim()) {
                  notify("Vui lòng nhập lý do hợp lệ", { type: "warning" });
                  return;
                }
                try {
                  await reasonModal.onConfirm(modalReasonInput.trim());
                  setReasonModal(prev => ({ ...prev, isOpen: false }));
                } catch (err: any) {
                  notify(err.response?.data?.message || "Đã xảy ra lỗi khi thực hiện hành động", { type: "error" });
                }
              }}
              className="cursor-pointer bg-destructive hover:bg-destructive/95"
            >
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
