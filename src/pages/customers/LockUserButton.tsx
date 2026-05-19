import { useState, type MouseEvent } from "react";
import { useNotify, useRecordContext, useRefresh, useUpdate } from "ra-core";
import { Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isCurrentAdminUser } from "@/lib/currentAdminUser";

type LockUserButtonProps = {
  record?: { id: string; status?: string; role?: string };
  size?: "sm" | "default" | "lg" | "icon";
  variant?: "outline" | "destructive" | "ghost" | "secondary";
  className?: string;
  showLabel?: boolean;
};

export const LockUserButton = ({
  record: recordProp,
  size = "sm",
  variant,
  className,
  showLabel = true,
}: LockUserButtonProps) => {
  const recordFromContext = useRecordContext();
  const record = recordProp ?? recordFromContext;
  const [update] = useUpdate();
  const notify = useNotify();
  const refresh = useRefresh();
  const [loading, setLoading] = useState(false);

  if (!record || isCurrentAdminUser(record)) {
    return null;
  }

  const isLocked = record.status === "LOCKED";
  const nextStatus = isLocked ? "ACTIVE" : "LOCKED";

  const handleClick = async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    setLoading(true);
    try {
      await update(
        "customers",
        { id: record.id, data: { status: nextStatus }, previousData: record },
        { returnPromise: true },
      );
      notify(isLocked ? "Đã mở khóa tài khoản" : "Đã khóa tài khoản", { type: "success" });
      refresh();
    } catch {
      notify("Thao tác thất bại", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const buttonVariant = variant ?? (isLocked ? "outline" : "destructive");
  const Icon = isLocked ? Unlock : Lock;
  const label = isLocked ? "Mở khóa" : "Khóa tài khoản";

  return (
    <Button
      type="button"
      variant={buttonVariant}
      size={size}
      className={className}
      disabled={loading}
      onClick={handleClick}
      title={label}
    >
      <Icon className="h-4 w-4" />
      {showLabel && <span className="ml-2">{loading ? "Đang xử lý…" : label}</span>}
    </Button>
  );
};
