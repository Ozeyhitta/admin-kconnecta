import * as React from "react";
import { Link } from "react-router";
import { cachedApiGet, LIVE_CACHE_TTL } from "@/services/apiGetCache";
import { ADMIN_ONLINE_POLL_MS, useIntervalPoll } from "@/lib/adminStatsPoll";
import {
  AdminDetailModal,
  AdminDetailSidebar,
  InsightCard,
  MetricHeroCard,
} from "@/components/admin/admin-detail-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const fmt = new Intl.NumberFormat("vi-VN");
const timeFmt = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" });

type OnlineUserItem = {
  accountId: string;
  username?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  lastActiveAt?: string | null;
};

type OnlineUsersDetailResponse = {
  online: number;
  windowMinutes: number;
  updatedAt: string;
  users: OnlineUserItem[];
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fallbackCount?: number;
  returnTo?: string;
};

function OnlineUserRow({
  user,
  onNavigate,
  returnTo,
}: {
  user: OnlineUserItem;
  onNavigate?: () => void;
  returnTo?: string;
}) {
  const name = user.fullName ?? user.username ?? "Người dùng";
  return (
    <Link
      to={`/customers/${user.accountId}/show`}
      state={returnTo ? { returnTo } : undefined}
      onClick={onNavigate}
      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b last:border-b-0"
    >
      <span className="relative shrink-0">
        <Avatar className="size-9">
          <AvatarImage src={user.avatarUrl ?? undefined} alt={name} />
          <AvatarFallback className="text-xs">{name.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{name}</p>
        {user.username ? (
          <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
        ) : null}
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {user.lastActiveAt
            ? `Hoạt động: ${timeFmt.format(new Date(user.lastActiveAt))}`
            : "Có hoạt động gần đây"}
        </p>
      </div>
    </Link>
  );
}

export function OnlineUsersDetailDialog({ open, onOpenChange, fallbackCount, returnTo }: Props) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<OnlineUsersDetailResponse | null>(null);

  const fetchDetail = React.useCallback(async () => {
    try {
      const res = await cachedApiGet<OnlineUsersDetailResponse>(
        "/api/v1/admin/stats/online-users",
        undefined,
        LIVE_CACHE_TTL,
      );
      setData(res.data);
      setError(null);
    } catch {
      setData(null);
      setError("Không tải được danh sách người dùng đang online.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!open) {
      setData(null);
      setError(null);
      return;
    }
    setLoading(true);
    void fetchDetail();
  }, [open, fetchDetail]);

  useIntervalPoll(
    () => {
      if (!open) return;
      void fetchDetail();
    },
    ADMIN_ONLINE_POLL_MS,
    [open, fetchDetail],
  );

  const onlineCount = data?.online ?? fallbackCount ?? 0;
  const windowMinutes = data?.windowMinutes ?? 15;

  const left = (
    <>
      <MetricHeroCard
        label="Đang online"
        value={fmt.format(onlineCount)}
        sub={`Người dùng có hoạt động trong ${windowMinutes} phút gần nhất`}
        badge={
          data?.updatedAt ? (
            <span className="text-xs text-muted-foreground">
              Cập nhật: {timeFmt.format(new Date(data.updatedAt))}
            </span>
          ) : null
        }
      />

      <InsightCard title="Ghi chú" tone="muted">
        Tính online dựa trên lần hoạt động cuối hoặc nhật ký hành động trong cửa sổ{" "}
        {windowMinutes} phút — cùng logic với số hiển thị trên dashboard.
      </InsightCard>
    </>
  );

  const users = data?.users ?? [];

  const sidebar = (
    <AdminDetailSidebar
      title="Người dùng online"
      subtitle={loading ? "Đang tải…" : `${fmt.format(users.length)} người`}
      viewAllHref="/customers"
      viewAllState={returnTo ? { returnTo } : undefined}
      onViewAll={() => onOpenChange(false)}
    >
      {loading && !users.length ? (
        <p className="text-sm text-muted-foreground text-center py-16">Đang tải danh sách…</p>
      ) : error ? (
        <p className="text-sm text-destructive text-center py-16 px-4">{error}</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-16 px-4">
          Không có người dùng online trong {windowMinutes} phút gần nhất.
        </p>
      ) : (
        users.map((user) => (
          <OnlineUserRow
            key={user.accountId}
            user={user}
            onNavigate={() => onOpenChange(false)}
            returnTo={returnTo}
          />
        ))
      )}
    </AdminDetailSidebar>
  );

  return (
    <AdminDetailModal
      open={open}
      onOpenChange={onOpenChange}
      title="Chi tiết người dùng đang online"
      description={`Cửa sổ ${windowMinutes} phút · Cập nhật tự động`}
      left={left}
      sidebar={sidebar}
    />
  );
}
