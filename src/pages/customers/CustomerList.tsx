import type { ReactNode } from "react";
import { useRecordContext, useTranslate, FilterLiveForm } from "ra-core";
import {
  ColumnsButton,
  DataTable,
  ExportButton,
  List,
  ToggleFilterButton,
  TextInput,
  ListPagination,
  ShowButton,
} from "@/components/admin";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, User, CheckCircle } from "lucide-react";
import { FullNameField } from "./FullNameField";
import { isCurrentAdminUser } from "@/lib/currentAdminUser";
import { LockUserButton } from "./LockUserButton";

const shortDateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "short",
});

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  BLOCKED: "destructive",
  DELETED: "secondary",
};

const statusLabel: Record<string, string> = {
  ACTIVE: "Active",
  BLOCKED: "Blocked",
  DELETED: "Deleted",
};

const StatusBadge = () => {
  const record = useRecordContext();
  if (!record) return null;
  return (
    <Badge variant={statusVariant[record.status] ?? "outline"}>
      {statusLabel[record.status] ?? record.status}
    </Badge>
  );
};

const UserRowActions = () => {
  const record = useRecordContext();
  if (!record) return null;
  return (
    <div className="flex justify-end gap-1">
      <ShowButton label="" />
      {!isCurrentAdminUser({ id: String(record.id) }) && (
        <LockUserButton record={{ ...record, id: String(record.id) }} size="sm" variant="ghost" showLabel={false} />
      )}
    </div>
  );
};

const RoleBadge = () => {
  const record = useRecordContext();
  if (!record) return null;
  return (
    <Badge variant={record.role === "ADMIN" ? "default" : "outline"}>
      {record.role === "ADMIN" ? (
        <ShieldCheck className="w-3 h-3 mr-1" />
      ) : (
        <User className="w-3 h-3 mr-1" />
      )}
      {record.role}
    </Badge>
  );
};


export const CustomerList = () => {
  return (
    <List
      perPage={20}
      sort={{ field: "createdAt", order: "DESC" }}
      pagination={false}
      actions={
        <div className="flex items-center gap-2">
          <ColumnsButton />
          <ExportButton />
        </div>
      }
    >
      <div className="flex flex-row gap-4 mb-4">
        <SidebarFilters />
        <div className="flex-1 min-w-0">
          <DataTable>
            <DataTable.Col label="User" source="fullName">
              <FullNameField />
            </DataTable.Col>

            <DataTable.Col
              source="email"
              label="Email"
              className="hidden md:table-cell"
            />

            <DataTable.Col
              source="status"
              label="Status"
              className="hidden md:table-cell"
            >
              <StatusBadge />
            </DataTable.Col>

            <DataTable.Col
              source="role"
              label="Role"
              className="hidden md:table-cell"
            >
              <RoleBadge />
            </DataTable.Col>

            <DataTable.Col
              source="lastActiveAt"
              label="Last Active"
              render={(record) =>
                record.lastActiveAt
                  ? shortDateFormatter.format(new Date(record.lastActiveAt))
                  : "—"
              }
            />

            <DataTable.Col
              source="createdAt"
              label="Registered"
              className="hidden md:table-cell"
              render={(record) =>
                record.createdAt
                  ? shortDateFormatter.format(new Date(record.createdAt))
                  : "—"
              }
            />

            <DataTable.Col label={false} source="id" className="w-24 text-right">
              <UserRowActions />
            </DataTable.Col>
          </DataTable>
          <ListPagination className="justify-start mt-2" />
        </div>
      </div>
    </List>
  );
};

const SidebarFilters = () => {
  const translate = useTranslate();
  return (
    <div className="min-w-48 hidden md:block">
      <FilterLiveForm>
        <TextInput
          source="q"
          placeholder={translate("ra.action.search")}
          label={false}
          className="mb-6"
        />
      </FilterLiveForm>

      <FilterCategory icon={<CheckCircle size={16} />} label="Status">
        <ToggleFilterButton label="Active" value={{ status: "ACTIVE" }} />
        <ToggleFilterButton label="Blocked" value={{ status: "BLOCKED" }} />
        <ToggleFilterButton label="Deleted" value={{ status: "DELETED" }} />
      </FilterCategory>

      <FilterCategory icon={<ShieldCheck size={16} />} label="Role">
        <ToggleFilterButton label="User" value={{ role: "USER" }} />
        <ToggleFilterButton label="Admin" value={{ role: "ADMIN" }} />
      </FilterCategory>
    </div>
  );
};

const FilterCategory = ({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children?: ReactNode;
}) => (
  <>
    <h3 className="flex flex-row items-center gap-2 mb-1 font-bold text-sm">
      {icon}
      <span>{label}</span>
    </h3>
    <div className="flex flex-col items-start ml-3 mb-4">{children}</div>
  </>
);
