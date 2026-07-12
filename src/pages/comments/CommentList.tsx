import { useState, useEffect, useRef } from "react";
import type { RaRecord } from "ra-core";
import { useRecordContext, FilterLiveForm, useRefresh, useNotify, useListContext } from "ra-core";
import { Link } from "react-router";
import {
  DataTable,
  List,
  TextInput,
  AutocompleteInput,
  ListPagination,
  DeleteButton,
  HighlightText,
} from "@/components/admin";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Check, X, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { apiClient } from "@/services/axiosInstance";

const LOCK_RENEW_MS = 2 * 60 * 1000;

function apiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "response" in err) {
    const res = (err as { response?: { data?: { message?: string }; status?: number } }).response;
    if (res?.data?.message) return res.data.message;
  }
  return fallback;
}

function isLockedByOther(record: RaRecord): boolean {
  return Boolean(
    record.moderationLockedBy
    && !record.moderationLockedByMe
    && record.moderationLockedByUsername,
  );
}

const shortDateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
});

const ContentCell = () => {
  const record = useRecordContext();
  const { filterValues } = useListContext();
  const search = typeof filterValues?.q === "string" ? filterValues.q : undefined;

  if (!record) return null;
  const text = (record.content ?? "").trim();
  if (!text) {
    return <span className="text-xs italic text-muted-foreground">Không có nội dung</span>;
  }
  return (
    <span className="line-clamp-2 block min-w-0 break-words text-sm leading-snug" title={text}>
      <HighlightText text={text} search={search} />
    </span>
  );
};

const AuthorCell = () => {
  const record = useRecordContext();
  const { filterValues } = useListContext();
  const search = typeof filterValues?.q === "string" ? filterValues.q : undefined;

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
        <span className="block truncate font-medium" title={name}>
          <HighlightText text={name} search={search} />
        </span>
        {username ? (
          <span className="truncate text-xs text-muted-foreground" title={`@${username}`}>
            @<HighlightText text={username} search={search} />
          </span>
        ) : null}
      </div>
    </div>
  );
};

const STATUS_META: Record<string, { label: string; className: string }> = {
  APPROVED: { label: "Đã duyệt", className: "border-green-300 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" },
  PENDING: { label: "Chờ duyệt", className: "border-yellow-300 bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300" },
  REJECTED: { label: "Từ chối", className: "border-red-300 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300" },
};

const StatusCell = () => {
  const record = useRecordContext();
  if (!record?.status) return <span className="text-muted-foreground">—</span>;
  const meta = STATUS_META[record.status] ?? { label: String(record.status), className: "" };
  return (
    <Badge variant="outline" className={`${meta.className} whitespace-nowrap gap-1`}>
      {record.status === "PENDING" && (
        <Loader2 className="h-3 w-3 animate-spin" />
      )}
      {meta.label}
    </Badge>
  );
};

const ModerationReasonCell = () => {
  const record = useRecordContext();
  const reason = (record?.moderationFailReason ?? "").trim();
  if (!reason) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <p className="line-clamp-3 cursor-help text-xs leading-snug text-muted-foreground break-words whitespace-normal">
            {reason}
          </p>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-sm text-xs leading-relaxed">
          {reason}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Nút duyệt/từ chối — chỉ hiện cho comment PENDING. Một admin giữ khóa tại một thời điểm.
const ModerationActions = () => {
  const record = useRecordContext();
  const refresh = useRefresh();
  const notify = useNotify();
  const [busy, setBusy] = useState(false);
  const [lockHeld, setLockHeld] = useState(false);
  const [lockBlocked, setLockBlocked] = useState<string | null>(null);
  const lockHeldRef = useRef(false);

  useEffect(() => {
    if (!record || record.status !== "PENDING") return;

    if (isLockedByOther(record)) {
      setLockBlocked(
        `@${record.moderationLockedByUsername} đang duyệt bình luận này`,
      );
      return;
    }

    let cancelled = false;
    const acquire = async () => {
      try {
        await apiClient.post(`/api/v1/admin/comments/${record.id}/moderation-lock`);
        if (cancelled) return;
        lockHeldRef.current = true;
        setLockHeld(true);
        setLockBlocked(null);
      } catch (err) {
        if (cancelled) return;
        setLockBlocked(apiErrorMessage(err, "Không thể giữ khóa duyệt bình luận"));
      }
    };

    void acquire();

    const renewTimer = window.setInterval(() => {
      if (!lockHeldRef.current) return;
      void apiClient.post(`/api/v1/admin/comments/${record.id}/moderation-lock/renew`).catch(() => {
        lockHeldRef.current = false;
        setLockHeld(false);
        setLockBlocked("Khóa duyệt đã hết hạn — vui lòng tải lại trang");
      });
    }, LOCK_RENEW_MS);

    return () => {
      cancelled = true;
      window.clearInterval(renewTimer);
      if (lockHeldRef.current) {
        lockHeldRef.current = false;
        void apiClient.delete(`/api/v1/admin/comments/${record.id}/moderation-lock`).catch(() => {});
      }
    };
  }, [record?.id, record?.status, record?.moderationLockedBy, record?.moderationLockedByMe, record?.moderationLockedByUsername]);

  if (!record || record.status !== "PENDING") return null;

  if (lockBlocked) {
    return (
      <span className="max-w-[8rem] text-xs leading-snug text-amber-700 dark:text-amber-400" title={lockBlocked}>
        {lockBlocked}
      </span>
    );
  }

  if (!lockHeld) {
    return (
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Đang giữ khóa…
      </span>
    );
  }

  const approve = async () => {
    setBusy(true);
    try {
      await apiClient.post(`/api/v1/admin/comments/${record.id}/approve`);
      notify("Đã duyệt bình luận", { type: "success" });
      lockHeldRef.current = false;
      setLockHeld(false);
      refresh();
    } catch (err) {
      notify(apiErrorMessage(err, "Duyệt bình luận thất bại"), { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    const reason = window.prompt("Lý do từ chối (tuỳ chọn):", "");
    if (reason === null) return;
    setBusy(true);
    try {
      await apiClient.post(`/api/v1/admin/comments/${record.id}/reject`, { reason });
      notify("Đã từ chối bình luận", { type: "success" });
      lockHeldRef.current = false;
      setLockHeld(false);
      refresh();
    } catch (err) {
      notify(apiErrorMessage(err, "Từ chối bình luận thất bại"), { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Button size="sm" variant="ghost" className="h-8 px-2 text-green-600" onClick={approve} disabled={busy} title="Duyệt">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      </Button>
      <Button size="sm" variant="ghost" className="h-8 px-2 text-red-600" onClick={reject} disabled={busy} title="Từ chối">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
      </Button>
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
      actions={false}
    >
      <div className="flex h-full flex-col gap-4">
        <TopFilters />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-auto">
            <DataTable className="min-w-[1320px] [&_[data-slot=table-container]]:overflow-visible [&_[data-slot=table]]:table-fixed [&_[data-slot=table]]:w-full">
              <DataTable.Col
                source="id"
                label="ID"
                className="hidden sm:table-cell w-24 text-muted-foreground"
                headerClassName="overflow-hidden truncate"
                cellClassName="min-w-0 overflow-hidden py-2 align-middle"
                render={(record) => <CommentIdCell record={record} />}
              />

              <DataTable.Col
                source="authorFullName"
                label="Người bình luận"
                headerClassName="overflow-hidden truncate"
                cellClassName="min-w-0 overflow-hidden py-2 align-middle"
                className="w-48"
              >
                <AuthorCell />
              </DataTable.Col>

              <DataTable.Col
                source="content"
                label="Nội dung"
                className="min-w-[16rem]"
                headerClassName="pr-3"
                cellClassName="min-w-0 overflow-hidden py-2 pr-3 align-middle whitespace-normal"
              >
                <ContentCell />
              </DataTable.Col>

              <DataTable.Col
                source="postId"
                label="Bài đăng"
                cellClassName="min-w-0 overflow-hidden py-2 align-middle"
                className="hidden md:table-cell w-28 text-muted-foreground"
                render={(record) => <PostIdCell record={record} />}
              />

              <DataTable.Col
                source="status"
                label="Trạng thái"
                headerClassName="overflow-hidden truncate"
                className="w-24"
                cellClassName="min-w-0 py-2 align-middle"
              >
                <StatusCell />
              </DataTable.Col>

              <DataTable.Col
                source="moderationFailReason"
                label="Lý do kiểm duyệt"
                headerClassName="overflow-hidden whitespace-normal py-2 text-left align-top leading-tight"
                className="w-64 min-w-[14rem]"
                cellClassName="min-w-0 py-2 align-middle whitespace-normal"
              >
                <ModerationReasonCell />
              </DataTable.Col>

              <DataTable.Col
                source="createdAt"
                label="Thời gian"
                className="w-36"
                headerClassName="overflow-hidden whitespace-normal py-2 text-left align-top leading-tight [&_button]:m-0 [&_button]:max-w-full [&_button]:w-full [&_button]:justify-start [&_button]:px-1"
                cellClassName="py-2 align-middle text-sm whitespace-nowrap tabular-nums"
                render={(record) =>
                  record.createdAt ? shortDateFormatter.format(new Date(record.createdAt)) : "—"
                }
              />

              <DataTable.Col label="" source="actions" cellClassName="py-2 align-middle" className="w-28 text-right">
                <div className="flex items-center justify-end gap-1">
                  <ModerationActions />
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

const TopFilters = () => {
  return (
    <div className="w-full bg-card p-3 rounded-lg border">
      <FilterLiveForm>
        <div className="flex flex-wrap items-center gap-3">
          <TextInput
            source="q"
            placeholder="Tìm theo nội dung..."
            label={false}
            className="w-full sm:w-64"
          />
          <TextInput
            source="postId"
            placeholder="Lọc theo ID bài đăng..."
            label={false}
            className="w-full sm:w-48"
          />
          <AutocompleteInput
            source="status"
            placeholder="Lọc theo trạng thái..."
            label={false}
            className="w-full sm:w-48"
            choices={[
              { id: "PENDING", name: "Chờ duyệt" },
              { id: "APPROVED", name: "Đã duyệt" },
              { id: "REJECTED", name: "Từ chối" },
            ]}
          />
        </div>
      </FilterLiveForm>
    </div>
  );
};
