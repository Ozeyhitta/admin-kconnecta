import { ResourceProps } from "ra-core";
import { ActivityLogListPage } from "./ActivityLogList";
import { Activity } from "lucide-react";

export const activityLogs: ResourceProps = {
  name: "activity-logs",
  list: ActivityLogListPage,
  icon: Activity,
  options: { label: "Nhật ký hoạt động" },
};
