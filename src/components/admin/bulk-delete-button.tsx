/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Confirm } from "@/components/admin/confirm";
import { Trash } from "lucide-react";
import type { RaRecord, UseBulkDeleteControllerParams } from "ra-core";
import {
  useBulkDeleteController,
  useGetResourceLabel,
  useResourceContext,
  useResourceTranslation,
} from "ra-core";
import { cn } from "@/lib/utils";

/**
 * A button that deletes multiple selected records at once.
 *
 * Allows to delete selected records in a DataTable. Use within
 * the bulkActionsButtons prop of DataTable or inside BulkActionsToolbar.
 *
 * @see {@link https://marmelab.com/shadcn-admin-kit/docs/bulkdeletebutton/ BulkDeleteButton documentation}
 *
 * @example
 * import { BulkDeleteButton, BulkExportButton, DataTable, List } from '@/components/admin';
 *
 * export const PostList = () => (
 *   <List>
 *     <DataTable
 *       bulkActionsButtons={
 *         <>
 *           <BulkExportButton />
 *           <BulkDeleteButton />
 *         </>
 *       }
 *     >
 *       ...
 *     </DataTable>
 *   </List>
 * );
 */
export const BulkDeleteButton = <
  RecordType extends RaRecord = any,
  MutationOptionsError = unknown,
>({
  icon = defaultIcon,
  label: labelProp,
  className,
  ...props
}: BulkDeleteButtonProps<RecordType, MutationOptionsError>) => {
  const { handleDelete, isPending } = useBulkDeleteController(props);
  const resource = useResourceContext(props);
  const getResourceLabel = useGetResourceLabel();
  const label = useResourceTranslation({
    resourceI18nKey: resource
      ? `resources.${resource}.action.delete`
      : undefined,
    baseI18nKey: "ra.action.delete",
    options: {
      name: resource ? getResourceLabel(resource, 1) : undefined,
    },
    userText: labelProp,
  });

  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <Button
        variant="destructive"
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={isPending}
        aria-label={typeof label === "string" ? label : undefined}
        className={cn("h-9", className)}
      >
        {icon}
        {label}
      </Button>
      <Confirm
        isOpen={confirmOpen}
        title="Xác nhận xóa?"
        content="Bạn có chắc muốn xóa các mục đã chọn? Hành động này không thể hoàn tác."
        cancel="Huỷ"
        confirm="Xóa"
        confirmColor="warning"
        onClose={() => setConfirmOpen(false)}
        onConfirm={(e) => {
          handleDelete(e);
          setConfirmOpen(false);
        }}
        loading={isPending}
      />
    </>
  );
};

export type BulkDeleteButtonProps<
  RecordType extends RaRecord = any,
  MutationOptionsError = unknown,
> = {
  label?: string;
  icon?: ReactNode;
} & React.ComponentPropsWithoutRef<"button"> &
  UseBulkDeleteControllerParams<RecordType, MutationOptionsError>;

const defaultIcon = <Trash />;
