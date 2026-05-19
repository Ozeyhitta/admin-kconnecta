import { Resource, CustomRoutes } from "ra-core";
import { Route } from "react-router";
import { Admin } from "@/components/admin";

import { dataProvider } from "./services/dataProvider";
import { authProvider } from "./contexts/authProvider";
import { i18nProvider } from "./services/i18nProvider";
import { products } from "./pages/products";
import { categories } from "./pages/categories";
import { customers } from "./pages/customers";
import { reviews } from "./pages/reviews";
import { activityLogs } from "./pages/activityLogs";
import { posts } from "./pages/posts";
import { comments } from "./pages/comments";
import { Dashboard } from "./pages/dashboard/Dashboard";
import StatsPage from "./pages/stats/StatsPage";

function App() {
  return (
    <Admin
      title="HỆ THỐNG QUẢN TRỊ KCONNECTA"
      basename={import.meta.env.VITE_BASENAME ?? ""}
      dataProvider={dataProvider}
      authProvider={authProvider}
      i18nProvider={i18nProvider}
      dashboard={Dashboard}
      requireAuth
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
