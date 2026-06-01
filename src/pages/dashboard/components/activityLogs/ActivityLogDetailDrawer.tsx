import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertTriangle } from "lucide-react";
import { STATUS_LABELS, SEVERITY_LABELS, timeFormatter } from "./activityLogConstants";
import type { ActivityLogItem } from "./types";

interface Props {
  item: ActivityLogItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DetailRow = ({ label, value }: { label: string; value?: string | null }) => (
  <div className="grid grid-cols-[120px_1fr] gap-2 py-1.5 border-b border-dashed last:border-0">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="text-sm break-all">{value || "—"}</span>
  </div>
);

export const ActivityLogDetailDrawer = ({ item, open, onOpenChange }: Props) => {
  if (!item) return null;
  const statusCfg = STATUS_LABELS[item.status] ?? STATUS_LABELS.SUCCESS;
  const severityCfg = SEVERITY_LABELS[item.severity] ?? SEVERITY_LABELS.INFO;
  const name = item.fullName ?? item.username ?? "Không rõ";

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            Chi tiết hoạt động
            {item.abnormal && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" /> Bất thường
              </Badge>
            )}
          </DrawerTitle>
          <DrawerDescription>
            {item.createdAt ? timeFormatter.format(new Date(item.createdAt)) : ""}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-2 overflow-y-auto">
          <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-muted/40">
            <Avatar className="h-12 w-12">
              {item.avatarUrl && <AvatarImage src={item.avatarUrl} alt={name} />}
              <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{name}</p>
              {item.username && <p className="text-sm text-muted-foreground">@{item.username}</p>}
              {item.userId && <p className="text-[10px] font-mono text-muted-foreground/70 mt-0.5">{item.userId}</p>}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="outline">{item.actionLabel ?? item.actionType}</Badge>
            <Badge variant="outline" className={statusCfg.className}>{statusCfg.label}</Badge>
            <Badge variant="outline" className={severityCfg.className}>{severityCfg.label}</Badge>
          </div>

          {item.abnormal && item.abnormalReason && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <strong>Lý do cảnh báo:</strong> {item.abnormalReason}
            </div>
          )}

          <DetailRow label="Mô tả" value={item.description} />
          <DetailRow label="Loại hành động" value={item.actionType} />
          <DetailRow label="Đối tượng" value={item.targetType ? `${item.targetType}${item.targetId ? ` · ${item.targetId}` : ""}` : undefined} />
          <DetailRow label="IP" value={item.ipAddress} />
          <DetailRow label="Thiết bị" value={item.deviceType} />
          <DetailRow label="Trình duyệt" value={item.browser} />
          <DetailRow label="Hệ điều hành" value={item.os} />
          <DetailRow label="Vị trí" value={item.location} />
          <DetailRow label="User-Agent" value={item.userAgent} />
          {item.metadata && <DetailRow label="Metadata" value={item.metadata} />}
        </div>

        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Đóng</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default ActivityLogDetailDrawer;
