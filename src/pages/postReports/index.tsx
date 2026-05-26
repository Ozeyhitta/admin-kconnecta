import { ResourceProps } from "ra-core";
import { Flag } from "lucide-react";
import { PostReportList } from "./PostReportList";

export const postReports: ResourceProps = {
  name: "post-reports",
  list: PostReportList,
  icon: Flag,
  options: { label: "Quản lí báo cáo" },
};
