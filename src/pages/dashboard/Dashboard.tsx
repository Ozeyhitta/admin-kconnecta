import { Translate } from "ra-core";
import { Breadcrumb, BreadcrumbPage } from "@/components/admin";

import Welcome from "./Welcome";
import StatsOverview from "./StatsOverview";
import ActivityChart from "./OrderChart";
import UserGrowthChart from "./UserGrowthChart";
import NewCustomers from "./NewCustomers";

export const Dashboard = () => {
  return (
    <>
      <Breadcrumb>
        <BreadcrumbPage>
          <Translate i18nKey="ra.page.dashboard">Home</Translate>
        </BreadcrumbPage>
      </Breadcrumb>
      <Welcome />
      <StatsOverview />
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="flex flex-col gap-4 md:basis-2/3">
          <UserGrowthChart />
          <ActivityChart />
        </div>
        <div className="flex flex-col gap-4 md:basis-1/3">
          <NewCustomers />
        </div>
      </div>
    </>
  );
};

export default Dashboard;
