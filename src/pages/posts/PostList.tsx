import { useRecordContext, FilterLiveForm } from "ra-core";
import {
  DataTable,
  ExportButton,
  List,
  ToggleFilterButton,
  TextInput,
  ListPagination,
  ShowButton,
  DeleteButton,
} from "@/components/admin";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { MapPin, Star } from "lucide-react";
import { formatPostReportReason } from "@/lib/postReportDisplay";

const shortDateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
});

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PUBLISHED: { label: "Hiển thị", variant: "default" },
  DRAFT: { label: "Bản nháp", variant: "outline" },
  SCHEDULED: { label: "Đã lên lịch", variant: "secondary" },
  DELETED: { label: "Đã xóa", variant: "destructive" },
};

const PRIVACY_LABELS: Record<string, string> = {
  PUBLIC: "Công khai",
  FRIENDS: "Bạn bè",
  FRIENDS_EXCEPT: "Ngoại trừ",
  PRIVATE: "Chỉ mình tôi",
};

const StatusBadge = () => {
  const record = useRecordContext();
  if (!record) return null;
  const cfg = STATUS_CONFIG[record.status] ?? { label: record.status, variant: "outline" as const };
  return (
    <Badge variant={cfg.variant} className="text-xs whitespace-nowrap">
      {cfg.label}
    </Badge>
  );
};

const AuthorCell = () => {
  const record = useRecordContext();
  if (!record) return null;
  const name = record.authorFullName ?? record.authorUsername ?? "—";
  const initial = name.charAt(0).toUpperCase();
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarImage src={record.authorAvatarUrl} />
        <AvatarFallback className="text-xs">{initial}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="block truncate text-sm font-medium" title={name !== "—" ? name : undefined}>
          {name}
        </span>
        {record.authorUsername ? (
          <span
            className="block truncate text-xs text-muted-foreground"
            title={`@${record.authorUsername}`}
          >
            @{record.authorUsername}
          </span>
        ) : null}
      </div>
    </div>
  );
};

const ContentCell = () => {
  const record = useRecordContext();
  if (!record) return null;
  const text = (record.content ?? "").trim();
  const privacyLabel = record.privacy != null ? (PRIVACY_LABELS[record.privacy] ?? record.privacy) : null;

  return (
    <div className="min-w-0 space-y-1">
      {text ? (
        <p className="line-clamp-2 min-w-0 break-words text-sm leading-snug" title={text}>
          {text}
        </p>
      ) : (
        <span className="text-xs italic text-muted-foreground">Không có nội dung</span>
      )}
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
        {record.locationText ? (
          <span className="inline-flex max-w-full min-w-0 items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate" title={record.locationText}>
              {record.locationText}
            </span>
          </span>
        ) : null}
        {record.promoted ? (
          <span className="inline-flex shrink-0 items-center gap-1 text-amber-600">
            <Star className="h-3 w-3" />
            Promoted
          </span>
        ) : null}
        <span className="shrink-0">{privacyLabel ?? "—"}</span>
      </div>
    </div>
  );
};

const ReportCell = () => {
  const record = useRecordContext();
  if (!record) return null;

  const count = Number(record.reportCount ?? 0);
  if (count <= 0) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  const summary = formatPostReportReason(record.latestReportReason, record.latestReportCategory);

  return (
    <div className="min-w-0 space-y-1">
      <Badge variant="outline" className="border-orange-300 bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300">
        {count.toLocaleString("vi-VN")} báo cáo
      </Badge>
      <p className="line-clamp-2 break-words text-xs leading-snug text-muted-foreground" title={summary}>
        {summary}
      </p>
    </div>
  );
};

export const PostList = () => {
  return (
    <List
      perPage={20}
      sort={{ field: "updatedAt", order: "DESC" }}
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
            <DataTable className="min-w-[900px] [&_[data-slot=table-container]]:overflow-visible [&_[data-slot=table]]:table-fixed [&_[data-slot=table]]:w-full">
              <DataTable.Col
                source="authorFullName"
                label="Tác giả"
                cellClassName="min-w-0 overflow-hidden py-2 align-middle"
                className="w-56"
              >
                <AuthorCell />
              </DataTable.Col>

              <DataTable.Col
                source="content"
                label="Nội dung / Metadata"
                cellClassName="min-w-0 overflow-hidden py-2 align-middle whitespace-normal"
              >
                <ContentCell />
              </DataTable.Col>

              <DataTable.Col
                source="status"
                label="Trạng thái"
                cellClassName="py-2 align-middle"
                className="w-28"
              >
                <StatusBadge />
              </DataTable.Col>

              <DataTable.Col
                source="reportCount"
                label="Báo cáo"
                cellClassName="min-w-0 overflow-hidden py-2 align-middle whitespace-normal"
                className="hidden lg:table-cell w-44"
              >
                <ReportCell />
              </DataTable.Col>

              <DataTable.Col
                source="updatedAt"
                label="Cập nhật"
                className="hidden w-36 md:table-cell"
                headerClassName="overflow-hidden whitespace-normal py-2 text-left align-top leading-tight [&_button]:m-0 [&_button]:max-w-full [&_button]:w-full [&_button]:justify-start [&_button]:px-1"
                cellClassName="py-2 align-middle text-sm whitespace-nowrap tabular-nums"
                render={(r) =>
                  r.updatedAt
                    ? shortDateFormatter.format(new Date(r.updatedAt))
                    : r.publishedAt
                      ? shortDateFormatter.format(new Date(r.publishedAt))
                      : r.createdAt
                        ? shortDateFormatter.format(new Date(r.createdAt))
                        : "—"
                }
              />

              <DataTable.Col
                label=""
                source="id"
                cellClassName="py-2 align-middle"
                className="w-[4.75rem] shrink-0 whitespace-nowrap text-right"
              >
                <div className="flex justify-end gap-1">
                  <ShowButton label="" size="sm" variant="ghost" />
                  <DeleteButton label="" size="sm" variant="ghost" />
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

const TopFilters = () => (
  <div className="w-full bg-card p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div className="flex-1 min-w-[240px]">
      <FilterLiveForm>
        <TextInput
          source="q"
          placeholder="Tìm theo nội dung..."
          label={false}
          className="w-full sm:w-64"
        />
      </FilterLiveForm>
    </div>

    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-semibold text-muted-foreground mr-1">Trạng thái:</span>
      <ToggleFilterButton label="Hiển thị" value={{ status: "PUBLISHED" }} className="w-auto" />
      <ToggleFilterButton label="Bản nháp" value={{ status: "DRAFT" }} className="w-auto" />
      <ToggleFilterButton label="Đã lên lịch" value={{ status: "SCHEDULED" }} className="w-auto" />
      <ToggleFilterButton label="Đã xóa" value={{ status: "DELETED" }} className="w-auto" />
    </div>
  </div>
);
