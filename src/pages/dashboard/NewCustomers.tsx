import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { Link } from "react-router";
import { ListBase, WithListContext, useTranslate } from "ra-core";

import CardWithIcon from "./CardWithIcon";

type DashboardUser = {
  id: string;
  fullName?: string | null;
  username?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  createdAt?: string | null;
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
});

const formatDate = (value?: string | null) => {
  if (!value) return "No registration date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No registration date";
  return dateFormatter.format(date);
};

const NewCustomers = () => {
  const translate = useTranslate();

  return (
    <ListBase<DashboardUser>
      resource="customers"
      filter={{ role: "USER" }}
      sort={{ field: "createdAt", order: "DESC" }}
      perPage={10}
      disableSyncWithLocation
      render={({ data }) => (
        <CardWithIcon
          to="/customers"
          icon={UserPlus}
          title={translate("pos.dashboard.new_customers")}
          subtitle={<WithListContext render={({ total }) => <>{total}</>} />}
        >
          <div className="px-4 flex flex-col gap-4">
            {data?.map((record) => {
              const displayName =
                record.fullName ?? record.username ?? record.email ?? "Unknown user";
              const registeredDate = formatDate(record.createdAt);

              return (
                <Link
                  key={record.id}
                  className="flex-1 flex flex-row"
                  to={`/customers/${record.id}/show`}
                >
                  <div className="w-12 mt-2">
                    <Avatar>
                      <AvatarImage src={record.avatarUrl ?? undefined} alt={displayName} />
                      <AvatarFallback className="text-xs">
                        {displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 flex flex-col items-start justify-center text-sm">
                    <div>{displayName}</div>
                    <div className="text-muted-foreground">{registeredDate}</div>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="flex-grow">&nbsp;</div>
          <Link
            className={buttonVariants({ variant: "outline" })}
            to="/customers"
          >
            {translate("pos.dashboard.all_customers")}
          </Link>
        </CardWithIcon>
      )}
    />
  );
};

export default NewCustomers;
