import { ResourceProps } from "ra-core";
import { ActivityLogList } from "./ActivityLogList";
import { Activity } from "lucide-react";

export const activityLogs: ResourceProps = {
  name: "activity-logs",
  list: ActivityLogList,
  icon: Activity,
  options: { label: "Activity Logs" },
};
