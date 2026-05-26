import { FilterLiveForm, useRecordContext } from "ra-core";
import { Link } from "react-router";
import {
  DataTable,
  ExportButton,
  List,
  ListPagination,
  TextInput,
} from "@/components/admin";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
});

const UserPairCell = () => {
  const record = useRecordContext();
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
                {name}
              </div>
              {user.username ? (
                <div className="truncate text-xs text-muted-foreground">@{user.username}</div>
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
  if (!record) return null;
  const text = record.lastMessageContent?.trim();
  return text ? (
    <p className="line-clamp-2 max-w-md text-sm" title={text}>
      {text}
    </p>
  ) : (
    <span className="text-sm text-muted-foreground">Không có nội dung</span>
  );
};

const ConversationActions = () => {
  const record = useRecordContext();
  if (!record) return null;
  return (
    <Button asChild variant="ghost" size="sm">
      <Link to={`/conversations/${record.id}/show`}>
        <Eye className="h-4 w-4" />
      </Link>
    </Button>
  );
};

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
      <div className="flex flex-row gap-4 mb-4">
        <div className="min-w-56 hidden md:block">
          <FilterLiveForm>
            <TextInput
              source="q"
              placeholder="Tìm theo tên hoặc username..."
              label={false}
              className="mb-6"
            />
          </FilterLiveForm>
        </div>

        <div className="flex-1 min-w-0">
          <DataTable>
            <DataTable.Col label="Người tham gia" source="user1FullName">
              <UserPairCell />
            </DataTable.Col>
            <DataTable.Col label="Tin nhắn gần nhất" source="lastMessageContent">
              <LastMessageCell />
            </DataTable.Col>
            <DataTable.Col
              label="Số tin nhắn"
              source="messageCount"
              render={(record) => record.messageCount?.toLocaleString("vi-VN") ?? "0"}
              className="hidden md:table-cell"
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
              className="hidden lg:table-cell"
            />
            <DataTable.Col
              label="Cập nhật"
              source="lastMessageAt"
              render={(record) =>
                record.lastMessageAt
                  ? dateFormatter.format(new Date(record.lastMessageAt))
                  : "—"
              }
              className="hidden lg:table-cell"
            />
            <DataTable.Col label={false} source="id" className="w-16 text-right">
              <ConversationActions />
            </DataTable.Col>
          </DataTable>
          <ListPagination className="justify-start mt-2" />
        </div>
      </div>
    </List>
  );
};
