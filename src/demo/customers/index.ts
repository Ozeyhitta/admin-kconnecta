import { ResourceProps } from "ra-core";
import { CustomerList } from "./CustomerList";
import { CustomerEdit } from "./CustomerEdit";
import { CustomerShow } from "./CustomerShow";
import { Users } from "lucide-react";

export const customers: ResourceProps = {
  name: "customers",
  list: CustomerList,
  edit: CustomerEdit,
  show: CustomerShow,
  recordRepresentation: (record) =>
    record.fullName ?? record.username ?? record.email,
  icon: Users,
};
