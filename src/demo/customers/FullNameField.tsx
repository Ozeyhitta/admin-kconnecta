import { useRecordContext } from "ra-core";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { TextField } from "@/components/admin";

export const FullNameField = () => {
  const record = useRecordContext();
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
        <TextField
          source="fullName"
          title={typeof fullName === "string" ? fullName : undefined}
          className="block truncate font-medium"
        />
        {username ? (
          <span className="truncate text-xs text-muted-foreground" title={`@${username}`}>
            @{username}
          </span>
        ) : null}
      </div>
    </div>
  );
};
