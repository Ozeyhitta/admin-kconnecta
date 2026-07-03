import { useState, type MouseEvent } from "react";
import { useNotify, useRecordContext, useRefresh, useUpdate } from "ra-core";
import { Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isCurrentAdminUser } from "@/lib/currentAdminUser";
import { fetchPolicyConfig } from "@/services/policyApi";

type LockUserButtonProps = {
  record?: { id: string; status?: string; role?: string };
  size?: "sm" | "default" | "lg" | "icon";
  variant?: "outline" | "destructive" | "ghost" | "secondary";
  className?: string;
  showLabel?: boolean;
};

const FALLBACK_LOCK_DAYS = 3;

const readPolicyLockDays = async (): Promise<number> => {
  try {
    const config = await fetchPolicyConfig();
    const policy =
      config.violationPolicies.find((p) => p.id === "default") ?? config.violationPolicies[0];
    const step = policy?.steps.find((s) => s.action === "lock_temp");
    return step?.lockDays ?? FALLBACK_LOCK_DAYS;
  } catch {
    return FALLBACK_LOCK_DAYS;
  }
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<"temp" | "indefinite">("temp");
  const [days, setDays] = useState(FALLBACK_LOCK_DAYS);

  if (!record || isCurrentAdminUser({ id: String(record.id) }) || record.role === "ADMIN") {
    return null;
  }

  const isBlocked = record.status === "BLOCKED";
  const isDeleted = record.status === "DELETED";
  const isLocking = !(isBlocked || isDeleted);

  const applyStatus = async (data: { status: string; lockDays?: number | null }) => {
    setLoading(true);
    try {
      await update(
        "customers",
        { id: String(record.id), data, previousData: record },
        { returnPromise: true },
      );
      notify(data.status === "ACTIVE" ? "Đã mở lại tài khoản" : "Đã khóa tài khoản", { type: "success" });
      refresh();
    } catch {
      notify("Thao tác thất bại", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleClick = async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isLocking) {
      await applyStatus({ status: "ACTIVE" });
      return;
    }
    setDays(await readPolicyLockDays());
    setMode("temp");
    setDialogOpen(true);
  };

  const handleConfirmLock = async () => {
    setDialogOpen(false);
    await applyStatus({
      status: "BLOCKED",
      lockDays: mode === "temp" ? Math.max(days, 1) : null,
    });
  };

  const buttonVariant = variant ?? (isLocking ? "destructive" : "outline");
  const Icon = isLocking ? Lock : Unlock;
  const label = isDeleted ? "Khôi phục tài khoản" : isBlocked ? "Mở khóa" : "Khóa tài khoản";

  return (
    <>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Khóa tài khoản</DialogTitle>
            <DialogDescription>
              Chọn hình thức khóa. Khóa tạm thời sẽ tự mở lại sau khi hết hạn.
            </DialogDescription>
          </DialogHeader>

          <RadioGroup value={mode} onValueChange={(v) => setMode(v as "temp" | "indefinite")} className="gap-3">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="temp" id="lock-temp" />
              <Label htmlFor="lock-temp">Tạm thời</Label>
              <Input
                type="number"
                min={1}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                disabled={mode !== "temp"}
                className="ml-2 h-8 w-20"
              />
              <span className="text-sm text-muted-foreground">ngày</span>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="indefinite" id="lock-indefinite" />
              <Label htmlFor="lock-indefinite">Vô thời hạn</Label>
            </div>
          </RadioGroup>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleConfirmLock}>
              Khóa tài khoản
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
