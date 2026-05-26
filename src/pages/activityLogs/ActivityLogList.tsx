import type { ReactNode } from "react";
import { useRecordContext, FilterLiveForm } from "ra-core";
import {
  DataTable,
  ExportButton,
  List,
  ToggleFilterButton,
  TextInput,
  ListPagination,
} from "@/components/admin";
import { Badge } from "@/components/ui/badge";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

type ActivityLogRecord = {
  [key: string]: unknown;
  actionType?: string | null;
  metadata?: string | null;
  createdAt?: string | null;
};

const ACTION_TYPE_LABELS: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  LOGIN: { label: "Đăng nhập", variant: "default" },
  LOGOUT: { label: "Đăng xuất", variant: "secondary" },
  REGISTER: { label: "Đăng ký", variant: "default" },
  GOOGLE_LOGIN: { label: "Google Login", variant: "outline" },
  PASSWORD_CHANGED: { label: "Đổi mật khẩu", variant: "outline" },
  RESET_PASSWORD: { label: "Reset mật khẩu", variant: "outline" },
  POST_CREATED: { label: "Đăng bài", variant: "default" },
  POST_DELETED: { label: "Xóa bài", variant: "destructive" },
  COMMENT_ADDED: { label: "Bình luận", variant: "secondary" },
  REACTION_ADDED: { label: "Thả cảm xúc", variant: "secondary" },
  POST_SHARED: { label: "Chia sẻ bài", variant: "outline" },
  FRIEND_REQUEST_SENT: { label: "Kết bạn", variant: "outline" },
  FRIEND_ACCEPTED: { label: "Chấp nhận kết bạn", variant: "default" },
};

const REACTION_LABELS: Record<string, string> = {
  LIKE: "thích",
  LOVE: "yêu thích",
  HAHA: "haha",
  WOW: "wow",
  SAD: "buồn",
  ANGRY: "giận dữ",
};

const parseMetadata = (metadata?: string | null): Record<string, unknown> => {
  if (!metadata) return {};
  try {
    const parsed = JSON.parse(metadata);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const formatActivityDetail = (record: ActivityLogRecord) => {
  const metadata = parseMetadata(record.metadata);
  const reactionType = typeof metadata.type === "string" ? metadata.type : undefined;

  switch (record.actionType) {
    case "LOGIN":
      return "Đăng nhập vào hệ thống";
    case "LOGOUT":
      return "Đăng xuất khỏi hệ thống";
    case "REGISTER":
      return "Tạo tài khoản mới";
    case "GOOGLE_LOGIN":
      return "Đăng nhập bằng Google";
    case "PASSWORD_CHANGED":
      return "Đổi mật khẩu tài khoản";
    case "RESET_PASSWORD":
      return "Đặt lại mật khẩu";
    case "POST_CREATED":
      return "Đăng bài viết mới";
    case "POST_DELETED":
      return "Xóa bài viết";
    case "COMMENT_ADDED":
      return "Bình luận vào một bài viết";
    case "REACTION_ADDED":
      return reactionType
        ? `Thả cảm xúc ${REACTION_LABELS[reactionType] ?? reactionType.toLowerCase()} vào bài viết`
        : "Thả cảm xúc vào bài viết";
    case "POST_SHARED":
      return "Chia sẻ bài viết";
    case "FRIEND_REQUEST_SENT":
      return "Gửi lời mời kết bạn";
    case "FRIEND_ACCEPTED":
      return "Chấp nhận lời mời kết bạn";
    default:
      return "—";
  }
};

const ActionTypeBadge = () => {
  const record = useRecordContext();
  if (!record) return null;
  const config = ACTION_TYPE_LABELS[record.actionType] ?? {
    label: record.actionType,
    variant: "outline" as const,
  };
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

export const ActivityLogList = () => {
  return (
    <List
      perPage={20}
      sort={{ field: "createdAt", order: "DESC" }}
      pagination={false}
      actions={
        <div className="flex items-center gap-2">
          <ExportButton />
        </div>
      }
    >
      <div className="flex flex-row gap-4 mb-4">
        <SidebarFilters />
        <div className="flex-1">
          <DataTable>
            <DataTable.Col source="username" label="Username" />
            <DataTable.Col source="actionType" label="Hành động">
              <ActionTypeBadge />
            </DataTable.Col>
            <DataTable.Col
              source="metadata"
              label="Chi tiết"
              render={(record) => formatActivityDetail(record)}
              className="hidden lg:table-cell text-muted-foreground text-xs max-w-xs truncate"
            />
            <DataTable.Col
              source="createdAt"
              label="Thời gian"
              render={(record) =>
                record.createdAt
                  ? dateFormatter.format(new Date(record.createdAt))
                  : "—"
              }
            />
          </DataTable>
          <ListPagination className="justify-start mt-2" />
        </div>
      </div>
    </List>
  );
};

const SidebarFilters = () => {
  return (
    <div className="min-w-48 hidden md:block">
      <FilterLiveForm>
        <TextInput
          source="q"
          placeholder="Tìm theo username..."
          label={false}
          className="mb-6"
        />
      </FilterLiveForm>

      <FilterCategory label="Hành động">
        <ToggleFilterButton label="Đăng nhập" value={{ actionType: "LOGIN" }} />
        <ToggleFilterButton label="Đăng xuất" value={{ actionType: "LOGOUT" }} />
        <ToggleFilterButton label="Đăng ký" value={{ actionType: "REGISTER" }} />
        <ToggleFilterButton label="Google Login" value={{ actionType: "GOOGLE_LOGIN" }} />
        <ToggleFilterButton label="Đăng bài" value={{ actionType: "POST_CREATED" }} />
        <ToggleFilterButton label="Xóa bài" value={{ actionType: "POST_DELETED" }} />
        <ToggleFilterButton label="Bình luận" value={{ actionType: "COMMENT_ADDED" }} />
        <ToggleFilterButton label="Cảm xúc" value={{ actionType: "REACTION_ADDED" }} />
        <ToggleFilterButton label="Chia sẻ bài" value={{ actionType: "POST_SHARED" }} />
        <ToggleFilterButton label="Kết bạn" value={{ actionType: "FRIEND_REQUEST_SENT" }} />
        <ToggleFilterButton label="Đổi mật khẩu" value={{ actionType: "PASSWORD_CHANGED" }} />
      </FilterCategory>
    </div>
  );
};

const FilterCategory = ({
  label,
  children,
}: {
  label: string;
  children?: ReactNode;
}) => (
  <>
    <h3 className="mb-1 font-bold text-sm">{label}</h3>
    <div className="flex flex-col items-start ml-3 mb-4">{children}</div>
  </>
);
