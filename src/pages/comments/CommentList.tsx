import type { RaRecord } from "ra-core";
import { useRecordContext, FilterLiveForm } from "ra-core";
import { Link } from "react-router";
import {
  DataTable,
  ExportButton,
  List,
  TextInput,
  ListPagination,
  DeleteButton,
} from "@/components/admin";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

const shortDateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
});

const ContentCell = () => {
  const record = useRecordContext();
  if (!record) return null;
  const text = (record.content ?? "").trim();
  if (!text) {
    return <span className="text-xs italic text-muted-foreground">Không có nội dung</span>;
  }
  return (
    <span className="line-clamp-2 block min-w-0 break-words text-sm leading-snug" title={text}>
      {text}
    </span>
  );
};

const AuthorCell = () => {
  const record = useRecordContext();
  if (!record) return null;
  const name = record.authorFullName ?? record.authorName ?? record.authorUsername ?? "?";
  const username = record.authorUsername;
  const initial = name.charAt(0).toUpperCase();
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarImage src={record.authorAvatarUrl} />
        <AvatarFallback className="text-xs">{initial}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="block truncate font-medium" title={name}>{name}</span>
        {username ? (
          <span className="truncate text-xs text-muted-foreground" title={`@${username}`}>
            @{username}
          </span>
        ) : null}
      </div>
    </div>
  );
};

const PostIdCell = ({ record }: { record: RaRecord }) => {
  const id = record.postId ?? record.post_id;
  if (id == null || id === "") return <span className="text-muted-foreground">—</span>;
  const text = String(id);
  return (
    <Button asChild variant="ghost" size="sm" className="h-8 px-2" title={text}>
      <Link to={`/posts/${text}/show`}>
        <ExternalLink className="h-4 w-4" />
        Xem bài
      </Link>
    </Button>
  );
};

const CommentIdCell = ({ record }: { record: RaRecord }) => {
  const id = record.id;
  if (id == null || id === "") {
    return <span className="text-muted-foreground">—</span>;
  }
  const text = String(id);
  return (
    <span className="block min-w-0 max-w-full truncate font-mono text-xs text-muted-foreground" title={text}>
      {text}
    </span>
  );
};

export const CommentList = () => {
  return (
    <List
      perPage={20}
      sort={{ field: "createdAt", order: "DESC" }}
      pagination={false}
      className="flex-1 min-h-0 overflow-hidden"
      actions={
        <div className="flex items-center gap-2">
          <ExportButton />
        </div>
      }
    >
      <div className="flex h-full flex-row gap-4">
        <SidebarFilters />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-auto">
            <DataTable className="min-w-[680px] [&_[data-slot=table-container]]:overflow-visible [&_[data-slot=table]]:table-fixed [&_[data-slot=table]]:w-full">
              <DataTable.Col
                source="id"
                label="ID"
                className="w-[10rem] min-w-[10rem] max-w-[10rem]"
                headerClassName="max-w-[10rem] overflow-hidden truncate"
                cellClassName="min-w-0 max-w-[10rem] overflow-hidden whitespace-normal py-2 align-middle"
                render={(record) => <CommentIdCell record={record} />}
              />

              <DataTable.Col
                source="authorFullName"
                label="Người bình luận"
                cellClassName="min-w-0 overflow-hidden py-2 align-middle"
                className="min-w-[10rem] w-[22%]"
              >
                <AuthorCell />
              </DataTable.Col>

              <DataTable.Col
                source="content"
                label="Nội dung"
                cellClassName="min-w-0 overflow-hidden py-2 align-middle"
                className="min-w-[12rem] w-[37%]"
              >
                <ContentCell />
              </DataTable.Col>

              <DataTable.Col
                source="postId"
                label="Bài đăng"
                cellClassName="min-w-0 overflow-hidden py-2 align-middle"
                className="hidden w-[7.5rem] min-w-[6rem] lg:table-cell text-muted-foreground"
                render={(record) => <PostIdCell record={record} />}
              />

              <DataTable.Col
                source="createdAt"
                label="Thời gian"
                className="w-[9rem] min-w-[9rem] max-w-[9rem]"
                headerClassName="overflow-hidden whitespace-normal py-2 text-left align-top leading-tight [&_button]:m-0 [&_button]:max-w-full [&_button]:w-full [&_button]:justify-start [&_button]:px-1"
                cellClassName="py-2 align-middle text-sm whitespace-nowrap tabular-nums"
                render={(record) =>
                  record.createdAt ? shortDateFormatter.format(new Date(record.createdAt)) : "—"
                }
              />

              <DataTable.Col label="" source="actions" cellClassName="py-2 align-middle" className="w-16 text-right">
                <div className="flex justify-end">
                  <DeleteButton size="sm" variant="ghost" mutationMode="pessimistic" />
                </div>
              </DataTable.Col>
            </DataTable>
          </div>
          <ListPagination className="mt-2 shrink-0 justify-start" />
        </div>
      </div>
    </List>
  );
};

const SidebarFilters = () => {
  return (
    <div className="hidden min-w-48 shrink-0 md:block">
      <FilterLiveForm>
        <TextInput
          source="q"
          placeholder="Tìm theo nội dung..."
          label={false}
          className="mb-4"
        />
        <TextInput
          source="postId"
          placeholder="Lọc theo ID bài đăng..."
          label={false}
          className="mb-4"
        />
      </FilterLiveForm>
    </div>
  );
};
