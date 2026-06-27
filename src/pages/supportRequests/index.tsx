import { ResourceProps } from "ra-core";
import { SupportRequestList } from "./SupportRequestList";
import { LifeBuoy } from "lucide-react";

export const supportRequests: ResourceProps = {
  name: "support-requests",
  list: SupportRequestList,
  icon: LifeBuoy,
  options: { label: "Yêu cầu hỗ trợ" },
};
