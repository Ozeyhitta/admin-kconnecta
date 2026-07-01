import { useShowController, useDelete, useNotify, useRefresh } from "ra-core";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, CheckCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatChatMessagePreview } from "@/lib/chatMessagePreview";
import { apiClient } from "@/services/axiosInstance";
import { useState } from "react";

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
};

type ConversationDetail = ConversationSummary & {
  id: string;
  summary?: ConversationSummary;
  messages?: ChatMessage[];
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
  const navigate = useNavigate();
  const notify = useNotify();
  const refresh = useRefresh();
  const [deleteOne, { isPending: isDeleting }] = useDelete();
  const [deletingMsgId, setDeletingMsgId] = useState<string | null>(null);

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
  const messages = record.messages ?? [];

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

  const handleDeleteConversation = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ cuộc hội thoại này?")) {
      deleteOne(
        "conversations",
        { id: record.id },
        {
          onSuccess: () => {
            notify("Đã xóa cuộc hội thoại thành công", { type: "info" });
            navigate("/conversations");
          },
          onError: () => {
            notify("Lỗi khi xóa cuộc hội thoại", { type: "error" });
          },
        }
      );
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa tin nhắn này?")) {
      setDeletingMsgId(messageId);
      try {
        await apiClient.delete(`/api/v1/admin/conversations/messages/${messageId}`);
        notify("Đã xóa tin nhắn thành công", { type: "info" });
        refresh();
      } catch (error) {
        notify("Lỗi khi xóa tin nhắn", { type: "error" });
      } finally {
        setDeletingMsgId(null);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/conversations">
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mr-2">
            <Badge variant="outline">{summary.messageCount ?? messages.length} tin nhắn</Badge>
            <Badge variant="secondary">{summary.unreadCount ?? 0} chưa đọc</Badge>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteConversation}
            disabled={isDeleting}
            className="flex items-center gap-1.5"
          >
            <Trash2 className="h-4 w-4" />
            Xóa hội thoại
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <ParticipantCard user={user1} />
        <ParticipantCard user={user2} />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="border-b px-4 py-3 font-medium">
            Lịch sử trò chuyện gần nhất
          </div>
          <div className="divide-y">
            {messages.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                Chưa có tin nhắn
              </p>
            ) : (
              messages.map((message) => {
                const senderName = message.senderFullName ?? message.senderUsername ?? "Người dùng";
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
                        <span className="ml-auto text-xs text-muted-foreground pr-12">
                          {message.createdAt ? dateFormatter.format(new Date(message.createdAt)) : "-"}
                        </span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm pr-12">
                        {message.deleted ? (
                          <span className="italic text-muted-foreground">Tin nhắn đã bị xóa</span>
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
                      </div>
                    </div>

                    {!message.deleted && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteMessage(message.id)}
                        disabled={deletingMsgId === message.id}
                        className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                        title="Xóa tin nhắn này"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
