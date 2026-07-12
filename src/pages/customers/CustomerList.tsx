import { useRecordContext, useTranslate, FilterLiveForm, useListContext } from "ra-core";
import {
  ColumnsButton,
  DataTable,
  List,
  ToggleFilterButton,
  TextInput,
  ListPagination,
  ShowButton,
  HighlightText,
} from "@/components/admin";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ShieldCheck, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
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
      <ShowButton label="" aria-label="Xem chi tiết" />
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
  const location = useLocation();
  const navigate = useNavigate();
  const returnTo = (
    location.state
    && typeof location.state === "object"
    && "returnTo" in location.state
    && typeof location.state.returnTo === "string"
  )
    ? location.state.returnTo
    : null;

  return (
    <>
      {returnTo && (
        <button
          type="button"
          onClick={() => navigate(returnTo)}
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại chi tiết trên Trang chủ
        </button>
      )}
      <List
      perPage={20}
      sort={{ field: "createdAt", order: "DESC" }}
      pagination={false}
      actions={
        <div className="flex items-center gap-2">
          <ColumnsButton />
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <TopFilters />
        <div className="flex-1 min-w-0">
          <div className="overflow-x-auto overflow-y-auto">
            <DataTable className="min-w-[1000px] [&_[data-slot=table-container]]:overflow-visible [&_[data-slot=table]]:table-fixed [&_[data-slot=table]]:w-full">
              <DataTable.Col label="User" source="fullName" className="w-56">
                <FullNameField />
              </DataTable.Col>

              <DataTable.Col
                source="email"
                label="Email"
                className="hidden md:table-cell"
                cellClassName="whitespace-normal overflow-hidden truncate"
                render={(record) => {
                  const { filterValues } = useListContext();
                  const search = typeof filterValues?.q === "string" ? filterValues.q : undefined;
                  return record.email ? <HighlightText text={record.email} search={search} /> : "—";
                }}
              />

              <DataTable.Col
                source="status"
                label="Status"
                className="hidden md:table-cell w-28"
              >
                <StatusBadge />
              </DataTable.Col>

              <DataTable.Col
                source="role"
                label="Role"
                className="hidden md:table-cell w-28"
              >
                <RoleBadge />
              </DataTable.Col>

              <DataTable.Col
                source="lastActiveAt"
                label="Last Active"
                className="w-36"
                render={(record) =>
                  record.lastActiveAt
                    ? shortDateFormatter.format(new Date(record.lastActiveAt))
                    : "—"
                }
              />

              <DataTable.Col
                source="createdAt"
                label="Registered"
                className="hidden md:table-cell w-36"
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
          </div>
          <ListPagination className="justify-start mt-2" />
        </div>
      </div>
      </List>
    </>
  );
};

const TopFilters = () => {
  const translate = useTranslate();
  return (
    <div className="w-full bg-card p-3 rounded-lg border flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div className="flex-1 min-w-[240px]">
        <FilterLiveForm>
          <TextInput
            source="q"
            placeholder={translate("ra.action.search")}
            label={false}
            className="w-full sm:w-64"
          />
        </FilterLiveForm>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-muted-foreground mr-1">Status:</span>
          <ToggleFilterButton label="Active" value={{ status: "ACTIVE" }} className="w-auto" />
          <ToggleFilterButton label="Blocked" value={{ status: "BLOCKED" }} className="w-auto" />
          <ToggleFilterButton label="Deleted" value={{ status: "DELETED" }} className="w-auto" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-muted-foreground mr-1">Role:</span>
          <ToggleFilterButton label="User" value={{ role: "USER" }} className="w-auto" />
          <ToggleFilterButton label="Admin" value={{ role: "ADMIN" }} className="w-auto" />
        </div>
      </div>
    </div>
  );
};
