import { useRecordContext, useListContext } from "ra-core";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { HighlightText } from "@/components/admin";

export const FullNameField = () => {
  const record = useRecordContext();
  const { filterValues } = useListContext();
  const search = typeof filterValues?.q === "string" ? filterValues.q : undefined;

  const fullName = record?.fullName;
  const username = record?.username;

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarImage src={record?.avatarUrl} />
        <AvatarFallback className="text-xs">
          {fullName?.charAt(0) ?? username?.charAt(0) ?? "?"}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="block truncate font-medium" title={typeof fullName === "string" ? fullName : undefined}>
          {fullName ? <HighlightText text={fullName} search={search} /> : "—"}
        </span>
        {username ? (
          <span className="truncate text-xs text-muted-foreground" title={`@${username}`}>
            @<HighlightText text={username} search={search} />
          </span>
        ) : null}
      </div>
    </div>
  );
};
