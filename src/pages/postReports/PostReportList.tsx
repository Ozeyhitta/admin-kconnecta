import type { RaRecord } from "ra-core";
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
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { formatPostReportReason } from "@/lib/postReportDisplay";

const shortDateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
});

const PersonCell = ({ type }: { type: "reporter" | "author" }) => {
  const record = useRecordContext();
  if (!record) return null;

  const prefix = type === "reporter" ? "reporter" : "postAuthor";
  const name = record[`${prefix}FullName`] ?? record[`${prefix}Username`] ?? "-";
  const username = record[`${prefix}Username`];
  const avatar = record[`${prefix}AvatarUrl`];
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarImage src={avatar} />
        <AvatarFallback className="text-xs">{initial}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="block truncate text-sm font-medium" title={name}>
          {name}
        </span>
        {username ? (
          <span className="truncate text-xs text-muted-foreground" title={`@${username}`}>
            @{username}
          </span>
        ) : null}
      </div>
    </div>
  );
};

const ReportContentCell = () => {
  const record = useRecordContext();
  if (!record) return null;
  const reason = formatPostReportReason(record.reason, record.category);
  const postContent = (record.postContent ?? "").trim();

  return (
    <div className="min-w-0 space-y-1">
      <p className="line-clamp-2 break-words text-sm leading-snug" title={reason}>
        {reason}
      </p>
      <p className="line-clamp-1 break-words text-xs text-muted-foreground" title={postContent}>
        {postContent || "Bài viết không có nội dung chữ"}
      </p>
    </div>
  );
};

const ViewPostButton = ({ record }: { record: RaRecord }) => {
  const postId = record.postId;
  if (!postId) return <span className="text-muted-foreground">-</span>;

  return (
    <Button asChild variant="ghost" size="sm" className="h-8 px-2">
      <Link to={`/posts/${postId}/show`}>
        <ExternalLink className="h-4 w-4" />
        Xem bài
      </Link>
    </Button>
  );
};

export const PostReportList = () => {
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
      <div className="flex h-full flex-col gap-4">
        <TopFilters />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-auto">
            <DataTable
              rowClick={(_id, _resource, record) => `/posts/${record.postId}/show`}
              className="min-w-[900px] [&_[data-slot=table-container]]:overflow-visible [&_[data-slot=table]]:table-fixed [&_[data-slot=table]]:w-full"
            >
              <DataTable.Col
                source="reporterFullName"
                label="Người báo cáo"
                cellClassName="min-w-0 overflow-hidden py-2 align-middle"
                className="w-48"
              >
                <PersonCell type="reporter" />
              </DataTable.Col>

              <DataTable.Col
                source="postAuthorFullName"
                label="Tác giả bài viết"
                cellClassName="min-w-0 overflow-hidden py-2 align-middle"
                className="hidden md:table-cell w-48"
              >
                <PersonCell type="author" />
              </DataTable.Col>

              <DataTable.Col
                source="reason"
                label="Nội dung báo cáo"
                cellClassName="min-w-0 overflow-hidden py-2 align-middle whitespace-normal"
              >
                <ReportContentCell />
              </DataTable.Col>

              <DataTable.Col
                source="createdAt"
                label="Thời gian"
                className="hidden lg:table-cell w-40"
                cellClassName="py-2 align-middle text-sm whitespace-nowrap tabular-nums"
                render={(record) =>
                  record.createdAt ? shortDateFormatter.format(new Date(record.createdAt)) : "-"
                }
              />

              <DataTable.Col
                label=""
                source="postId"
                cellClassName="py-2 align-middle"
                className="w-[6rem] text-right"
                render={(record) => (
                  <div className="flex justify-end">
                    <ViewPostButton record={record} />
                  </div>
                )}
              />
            </DataTable>
          </div>
          <ListPagination className="mt-2 shrink-0 justify-start" />
        </div>
      </div>
    </List>
  );
};

const TopFilters = () => (
  <div className="w-full bg-card p-3 rounded-lg border">
    <FilterLiveForm>
      <div className="flex flex-wrap items-center gap-3">
        <TextInput
          source="q"
          placeholder="Tìm báo cáo..."
          label={false}
          className="w-full sm:w-64"
        />
        <TextInput
          source="postId"
          placeholder="Lọc theo ID bài..."
          label={false}
          className="w-full sm:w-48"
        />
      </div>
    </FilterLiveForm>
  </div>
);
