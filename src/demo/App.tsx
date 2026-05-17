import { Resource, CustomRoutes } from "ra-core";
import { Route } from "react-router";
import { Admin } from "@/components/admin";

import { dataProvider } from "./dataProvider";
import { authProvider } from "./authProvider";
import { i18nProvider } from "./i18nProvider";
import { products } from "./products";
import { categories } from "./categories";
import { customers } from "./customers";
import { reviews } from "./reviews";
import { activityLogs } from "./activityLogs";
import { posts } from "./posts";
import { comments } from "./comments";
import { Dashboard } from "./dashboard/Dashboard";
import StatsPage from "./stats/StatsPage";

function App() {
  return (
    <Admin
      title="HỆ THỐNG QUẢN TRỊ KCONNECTA"
      basename={import.meta.env.VITE_BASENAME ?? "/"}
      dataProvider={dataProvider}
      authProvider={authProvider}
      i18nProvider={i18nProvider}
      dashboard={Dashboard}
    >
      <CustomRoutes>
        <Route path="/stats" element={<StatsPage />} />
      </CustomRoutes>
      <Resource {...products} />
      <Resource {...categories} />
      <Resource {...customers} />
      <Resource {...reviews} />
      <Resource {...activityLogs} />
      <Resource {...posts} />
      <Resource {...comments} />
    </Admin>
  );
}

export default App;
