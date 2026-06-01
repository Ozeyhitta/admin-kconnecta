import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { groupLogsByDate } from "./activityLogConstants";
import { ActivityLogItemRow } from "./ActivityLogItem";
import type { ActivityLogItem } from "./types";

interface Props {
  items: ActivityLogItem[];
  loading?: boolean;
  error?: string | null;
  onItemClick?: (item: ActivityLogItem) => void;
  emptyMessage?: string;
}

export const ActivityLogList = ({
  items,
  loading,
  error,
  onItemClick,
  emptyMessage = "Chưa có hoạt động nào trong khoảng thời gian này.",
}: Props) => {
  if (loading) {
    return (
      <Card className="overflow-hidden divide-y">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-3 px-4 py-3">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-64" />
            </div>
          </div>
        ))}
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-center text-sm text-red-600 bg-red-50 border-red-200">
        {error}
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </Card>
    );
  }

  const groups = groupLogsByDate(items);

  return (
    <Card className="overflow-hidden">
      {groups.map(group => (
        <div key={group.label}>
          <div className="sticky top-0 z-10 bg-muted/80 backdrop-blur px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b">
            {group.label}
          </div>
          {group.items.map(item => (
            <ActivityLogItemRow key={item.id} item={item} onClick={onItemClick} />
          ))}
        </div>
      ))}
    </Card>
  );
};

export default ActivityLogList;
