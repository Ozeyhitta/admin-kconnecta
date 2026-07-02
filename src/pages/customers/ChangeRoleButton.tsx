import { useState, type MouseEvent } from "react";
import { useNotify, useRecordContext, useRefresh, useUpdate } from "ra-core";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getLoggedInAdmin } from "@/lib/currentAdminUser";

type ChangeRoleButtonProps = {
  record?: { id: string; role?: string };
  className?: string;
};

export const ChangeRoleButton = ({ record: recordProp, className }: ChangeRoleButtonProps) => {
  const recordFromContext = useRecordContext();
  const record = recordProp ?? recordFromContext;
  const [update] = useUpdate();
  const notify = useNotify();
  const refresh = useRefresh();
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [role, setRole] = useState<string>(record?.role ?? "USER");

  const currentUser = getLoggedInAdmin();
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";

  // Chỉ SUPER_ADMIN được dùng, không được đổi role chính mình, không hiện với tài khoản USER.
  if (!record || !isSuperAdmin || String(currentUser?.id) === String(record.id) || record.role === "USER") {
    return null;
  }

  const handleOpen = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    setRole(record.role ?? "ADMIN");
    setDialogOpen(true);
  };

  const handleConfirm = async () => {
    setDialogOpen(false);
    setLoading(true);
    try {
      await update(
        "customers",
        { id: String(record.id), data: { role }, previousData: record },
        { returnPromise: true },
      );
      notify("Thay đổi vai trò thành công", { type: "success" });
      refresh();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Thao tác thất bại";
      notify(msg, { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={className}
        disabled={loading}
        onClick={handleOpen}
      >
        <ShieldAlert className="h-4 w-4 mr-2" />
        {loading ? "Đang xử lý…" : "Thay đổi vai trò"}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()} className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Thay đổi vai trò</DialogTitle>
            <DialogDescription>
              Chọn vai trò mới cho tài khoản này.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn vai trò" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">ADMIN (Quản trị viên)</SelectItem>
                <SelectItem value="SUPER_ADMIN">SUPER_ADMIN (Quản trị cấp cao)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleConfirm} disabled={loading}>
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
