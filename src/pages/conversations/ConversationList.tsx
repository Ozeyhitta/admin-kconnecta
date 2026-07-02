import { FilterLiveForm, useRecordContext, useListContext } from "ra-core";
import { Link } from "react-router";
import {
  DataTable,
  ExportButton,
  List,
  ListPagination,
  TextInput,
  SelectInput,
  DateInput,
  HighlightText,
} from "@/components/admin";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Trash2 } from "lucide-react";
import { formatChatMessagePreview } from "@/lib/chatMessagePreview";
import { useDelete, useNotify, useRefresh, usePermissions } from "ra-core";

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
});

const UserPairCell = () => {
  const record = useRecordContext();
  const { filterValues } = useListContext();
  const highlight = filterValues?.q;

  if (!record) return null;

  const users = [
    {
      fullName: record.user1FullName,
      username: record.user1Username,
      avatarUrl: record.user1AvatarUrl,
    },
    {
      fullName: record.user2FullName,
      username: record.user2Username,
      avatarUrl: record.user2AvatarUrl,
    },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {users.map((user) => {
        const name = user.fullName ?? user.username ?? "Người dùng";
        return (
          <div key={user.username ?? name} className="flex min-w-0 items-center gap-2">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarImage src={user.avatarUrl ?? undefined} />
              <AvatarFallback className="text-xs">
                {name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-medium" title={name}>
                <HighlightText text={name} search={highlight} />
              </div>
              {user.username ? (
                <div className="truncate text-xs text-muted-foreground">
                  @<HighlightText text={user.username} search={highlight} />
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const LastMessageCell = () => {
  const record = useRecordContext();
  const { filterValues } = useListContext();
  const highlight = filterValues?.q;

  if (!record) return null;
  const text = formatChatMessagePreview(record.lastMessageContent);
  return text ? (
    <p className="line-clamp-2 max-w-md text-sm" title={text}>
      <HighlightText text={text} search={highlight} />
    </p>
  ) : (
    <span className="text-sm text-muted-foreground">Không có nội dung</span>
  );
};

const ConversationActions = () => {
  const record = useRecordContext();
  const notify = useNotify();
  const refresh = useRefresh();
  const { permissions: role } = usePermissions();
  const [deleteOne, { isPending }] = useDelete();

  if (!record) return null;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    const promptMessage = role === "SUPER_ADMIN"
      ? "Bạn có chắc chắn muốn xóa mềm cuộc hội thoại này? (Nhấn xóa vĩnh viễn ở chi tiết cuộc hội thoại nếu cần)"
      : "Bạn có chắc chắn muốn xóa mềm cuộc hội thoại này?";
      
    if (window.confirm(promptMessage)) {
      deleteOne(
        "conversations",
        { id: record.id },
        {
          onSuccess: () => {
            notify("Đã xóa cuộc hội thoại thành công", { type: "info" });
            refresh();
          },
          onError: () => {
            notify("Lỗi khi xóa cuộc hội thoại", { type: "error" });
          },
        }
      );
    }
  };

  return (
    <div className="flex items-center gap-1 justify-end">
      <Button asChild variant="ghost" size="sm">
        <Link to={`/conversations/${record.id}/show`}>
          <Eye className="h-4 w-4" />
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDelete}
        disabled={isPending}
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

const TopFilters = () => (
  <div className="w-full bg-card p-4 rounded-lg border space-y-3">
    <FilterLiveForm>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Từ khóa tìm kiếm</label>
          <TextInput
            source="q"
            placeholder="Tìm theo tên/username..."
            label={false}
            className="w-full animate-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Trạng thái hội thoại</label>
          <SelectInput
            source="status"
            label={false}
            choices={[
              { id: "ACTIVE", name: "Đang hoạt động" },
              { id: "DELETED", name: "Đã xóa mềm" },
            ]}
            className="w-full"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Báo cáo vi phạm</label>
          <SelectInput
            source="hasReports"
            label={false}
            choices={[
              { id: "true", name: "Có tin nhắn bị báo cáo" },
              { id: "false", name: "Không bị báo cáo" },
            ]}
            className="w-full"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Từ ngày</label>
          <DateInput
            source="createdFrom"
            label={false}
            className="w-full"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Đến ngày</label>
          <DateInput
            source="createdTo"
            label={false}
            className="w-full"
          />
        </div>
      </div>
    </FilterLiveForm>
  </div>
);

export const ConversationList = () => {
  return (
    <List
      perPage={20}
      sort={{ field: "lastMessageAt", order: "DESC" }}
      pagination={false}
      actions={
        <div className="flex items-center gap-2">
          <ExportButton />
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <TopFilters />

        <div className="flex-1 min-w-0">
          <div className="overflow-x-auto overflow-y-auto">
            <DataTable className="min-w-[900px] [&_[data-slot=table-container]]:overflow-visible [&_[data-slot=table]]:table-fixed [&_[data-slot=table]]:w-full">
              <DataTable.Col label="Người tham gia" source="user1FullName" className="w-56">
                <UserPairCell />
              </DataTable.Col>
              <DataTable.Col label="Tin nhắn gần nhất" source="lastMessageContent" cellClassName="whitespace-normal">
                <LastMessageCell />
              </DataTable.Col>
              <DataTable.Col
                label="Trạng thái"
                source="status"
                render={(record) => {
                  const status = record.status ?? "ACTIVE";
                  if (status === "ACTIVE") return <Badge className="bg-green-500 hover:bg-green-600 text-white border-0">Đang hoạt động</Badge>;
                  if (status === "LOCKED") return <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-0">Đã khóa</Badge>;
                  return <Badge variant="destructive">Đã xóa mềm</Badge>;
                }}
                className="w-32"
              />
              <DataTable.Col
                label="Báo cáo"
                source="reportCount"
                render={(record) =>
                  record.reportCount > 0 ? (
                    <Badge variant="destructive" className="animate-pulse">Báo cáo ({record.reportCount})</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )
                }
                className="w-28"
              />
              <DataTable.Col
                label="Số tin nhắn"
                source="messageCount"
                render={(record) => record.messageCount?.toLocaleString("vi-VN") ?? "0"}
                className="hidden md:table-cell w-28"
              />
              <DataTable.Col
                label="Chưa đọc"
                source="unreadCount"
                render={(record) =>
                  record.unreadCount > 0 ? (
                    <Badge variant="secondary">{record.unreadCount}</Badge>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )
                }
                className="hidden lg:table-cell w-24"
              />
              <DataTable.Col
                label="Cập nhật"
                source="lastMessageAt"
                render={(record) =>
                  record.lastMessageAt
                    ? dateFormatter.format(new Date(record.lastMessageAt))
                    : "—"
                }
                className="hidden lg:table-cell w-40"
              />
              <DataTable.Col label={false} source="id" className="w-20 text-right">
                <ConversationActions />
              </DataTable.Col>
            </DataTable>
          </div>
          <ListPagination className="justify-start mt-2" />
        </div>
      </div>
    </List>
  );
};
