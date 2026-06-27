import { useState } from "react";
import { useRecordContext, FilterLiveForm, useRefresh, useNotify } from "ra-core";
import {
  DataTable,
  ExportButton,
  List,
  TextInput,
  AutocompleteInput,
  ListPagination,
} from "@/components/admin";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, PlayCircle, CheckCircle2, MessageSquare, Send } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { apiClient } from "@/services/axiosInstance";

const shortDateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
});

const CATEGORY_META: Record<string, { label: string; className: string }> = {
  BUG: { label: "Báo lỗi", className: "border-red-300 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300" },
  FEEDBACK: { label: "Góp ý", className: "border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  ACCOUNT: { label: "Tài khoản", className: "border-purple-300 bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300" },
  OTHER: { label: "Khác", className: "border-gray-300 bg-gray-50 text-gray-700 dark:bg-gray-900 dark:text-gray-300" },
};

const STATUS_META: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Chờ xử lý", className: "border-yellow-300 bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300" },
  IN_PROGRESS: { label: "Đang xử lý", className: "border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  RESOLVED: { label: "Đã xử lý", className: "border-green-300 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" },
};

const RequesterCell = () => {
  const record = useRecordContext();
  if (!record) return null;
  const name = record.fullName ?? record.username ?? "?";
  const username = record.username;
  const initial = String(name).charAt(0).toUpperCase();
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarImage src={record.avatarUrl} />
        <AvatarFallback className="text-xs">{initial}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="block truncate font-medium" title={name}>{name}</span>
        {username ? (
          <span className="truncate text-xs text-muted-foreground" title={`@${username}`}>@{username}</span>
        ) : record.contactEmail ? (
          <span className="truncate text-xs text-muted-foreground" title={record.contactEmail}>
            {record.contactEmail}
          </span>
        ) : null}
      </div>
    </div>
  );
};

const CategoryCell = () => {
  const record = useRecordContext();
  if (!record?.category) return <span className="text-muted-foreground">—</span>;
  const meta = CATEGORY_META[record.category] ?? { label: String(record.category), className: "" };
  return <Badge variant="outline" className={`${meta.className} whitespace-nowrap`}>{meta.label}</Badge>;
};

const StatusCell = () => {
  const record = useRecordContext();
  if (!record?.status) return <span className="text-muted-foreground">—</span>;
  const meta = STATUS_META[record.status] ?? { label: String(record.status), className: "" };
  return <Badge variant="outline" className={`${meta.className} whitespace-nowrap`}>{meta.label}</Badge>;
};

const MessageCell = () => {
  const record = useRecordContext();
  const subject = (record?.subject ?? "").trim();
  const message = (record?.message ?? "").trim();
  if (!subject && !message) {
    return <span className="text-xs italic text-muted-foreground">Không có nội dung</span>;
  }
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="min-w-0 cursor-help">
            <span className="block truncate text-sm font-medium" title={subject}>{subject}</span>
            <span className="line-clamp-2 block break-words text-xs leading-snug text-muted-foreground">{message}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-md text-xs leading-relaxed whitespace-pre-wrap">
          {message || subject}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Nút cập nhật trạng thái xử lý.
const StatusActions = () => {
  const record = useRecordContext();
  const refresh = useRefresh();
  const notify = useNotify();
  const [busy, setBusy] = useState(false);
  const [respondOpen, setRespondOpen] = useState(false);
  if (!record) return null;

  const canRespond = record.status === "PENDING";

  const setStatus = async (status: string, successMsg: string) => {
    setBusy(true);
    try {
      await apiClient.patch(`/api/v1/admin/support-requests/${record.id}/status`, { status });
      notify(successMsg, { type: "success" });
      refresh();
    } catch {
      notify("Cập nhật trạng thái thất bại", { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <>
            {canRespond && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-primary"
                onClick={() => setRespondOpen(true)}
                title="Phản hồi người dùng"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            )}
            {record.status !== "IN_PROGRESS" && record.status !== "RESOLVED" && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-blue-600"
                onClick={() => setStatus("IN_PROGRESS", "Đã chuyển sang Đang xử lý")}
                title="Đang xử lý"
              >
                <PlayCircle className="h-4 w-4" />
              </Button>
            )}
            {record.status !== "RESOLVED" && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-green-600"
                onClick={() => setStatus("RESOLVED", "Đã đánh dấu Đã xử lý")}
                title="Đã xử lý"
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
      </div>

      <SupportRespondDialog
        open={respondOpen}
        onClose={() => setRespondOpen(false)}
        record={record}
        onSuccess={() => {
          setRespondOpen(false);
          refresh();
        }}
      />
    </>
  );
};

interface SupportRecord {
  id: string;
  userId?: string;
  fullName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  contactEmail?: string | null;
  category?: string;
  subject?: string;
  message?: string;
  status?: string;
}

const SupportRespondDialog = ({
  open,
  onClose,
  record,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  record: SupportRecord;
  onSuccess: () => void;
}) => {
  const notify = useNotify();
  const [reply, setReply] = useState("");
  const [markResolved, setMarkResolved] = useState(true);
  const [sending, setSending] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setReply("");
      setMarkResolved(true);
      onClose();
    }
  };

  const handleSubmit = async () => {
    if (!reply.trim()) {
      notify("Vui lòng nhập nội dung phản hồi", { type: "warning" });
      return;
    }
    setSending(true);
    try {
      await apiClient.post(`/api/v1/admin/support-requests/${record.id}/respond`, {
        message: reply.trim(),
        markResolved,
      });
      notify("Đã gửi phản hồi qua thông báo cho người dùng", { type: "success" });
      setReply("");
      setMarkResolved(true);
      onSuccess();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      const msg = axiosErr.response?.data?.message ?? "Gửi phản hồi thất bại";
      notify(msg, { type: "error" });
    } finally {
      setSending(false);
    }
  };

  const requesterName = record.fullName ?? record.username ?? "Người dùng";
  const categoryMeta = record.category ? CATEGORY_META[record.category] : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Phản hồi yêu cầu hỗ trợ
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={record.avatarUrl ?? undefined} />
                <AvatarFallback className="text-xs">
                  {String(requesterName).charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{requesterName}</p>
                {record.username ? (
                  <p className="text-xs text-muted-foreground truncate">@{record.username}</p>
                ) : record.contactEmail ? (
                  <p className="text-xs text-muted-foreground truncate">{record.contactEmail}</p>
                ) : null}
              </div>
              {categoryMeta ? (
                <Badge variant="outline" className={`${categoryMeta.className} ml-auto shrink-0`}>
                  {categoryMeta.label}
                </Badge>
              ) : null}
            </div>
            {record.subject ? (
              <p className="text-sm font-medium">{record.subject}</p>
            ) : null}
            {record.message ? (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{record.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="support-reply">Nội dung phản hồi</Label>
            <Textarea
              id="support-reply"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={5}
              placeholder="Nhập phản hồi gửi tới người dùng qua thông báo..."
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Người dùng sẽ nhận phản hồi qua thông báo trên ứng dụng.
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={markResolved}
              onCheckedChange={(checked) => setMarkResolved(checked === true)}
            />
            Đánh dấu yêu cầu là đã xử lý
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={sending || !reply.trim()}>
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Send className="h-4 w-4 mr-1.5" />
            )}
            {sending ? "Đang gửi..." : "Gửi phản hồi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const SupportRequestList = () => {
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
            <DataTable className="min-w-[1000px] [&_[data-slot=table-container]]:overflow-visible [&_[data-slot=table]]:table-fixed [&_[data-slot=table]]:w-full">
              <DataTable.Col
                source="fullName"
                label="Người gửi"
                headerClassName="overflow-hidden truncate"
                cellClassName="min-w-0 overflow-hidden py-2 align-middle"
                className="w-56"
              >
                <RequesterCell />
              </DataTable.Col>

              <DataTable.Col
                source="category"
                label="Loại"
                className="w-28"
                cellClassName="min-w-0 py-2 align-middle"
              >
                <CategoryCell />
              </DataTable.Col>

              <DataTable.Col
                source="subject"
                label="Nội dung"
                cellClassName="min-w-0 overflow-hidden py-2 align-middle whitespace-normal"
              >
                <MessageCell />
              </DataTable.Col>

              <DataTable.Col
                source="status"
                label="Trạng thái"
                className="w-28"
                cellClassName="min-w-0 py-2 align-middle"
              >
                <StatusCell />
              </DataTable.Col>

              <DataTable.Col
                source="createdAt"
                label="Thời gian"
                className="w-40"
                cellClassName="py-2 align-middle text-sm whitespace-nowrap tabular-nums"
                render={(record) =>
                  record.createdAt ? shortDateFormatter.format(new Date(record.createdAt)) : "—"
                }
              />

              <DataTable.Col label="" source="actions" cellClassName="py-2 align-middle" className="w-36 text-right">
                <StatusActions />
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
            placeholder="Tìm theo tiêu đề / nội dung..."
            label={false}
            className="w-full sm:w-64"
          />
          <AutocompleteInput
            source="category"
            placeholder="Lọc theo loại..."
            label={false}
            className="w-full sm:w-44"
            choices={[
              { id: "BUG", name: "Báo lỗi" },
              { id: "FEEDBACK", name: "Góp ý" },
              { id: "ACCOUNT", name: "Tài khoản" },
              { id: "OTHER", name: "Khác" },
            ]}
          />
          <AutocompleteInput
            source="status"
            placeholder="Lọc theo trạng thái..."
            label={false}
            className="w-full sm:w-44"
            choices={[
              { id: "PENDING", name: "Chờ xử lý" },
              { id: "IN_PROGRESS", name: "Đang xử lý" },
              { id: "RESOLVED", name: "Đã xử lý" },
            ]}
          />
        </div>
      </FilterLiveForm>
    </div>
  );
};
