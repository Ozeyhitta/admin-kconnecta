import { Resource, CustomRoutes } from "ra-core";
import { Route } from "react-router";
import { Admin } from "@/components/admin";

import { dataProvider } from "./services/dataProvider";
import { authProvider } from "./contexts/authProvider";
import { i18nProvider } from "./services/i18nProvider";
import { customers } from "./pages/customers";
import { activityLogs } from "./pages/activityLogs";
import { posts } from "./pages/posts";
import { comments } from "./pages/comments";
import { conversations } from "./pages/conversations";
import { postReports } from "./pages/postReports";
import { AuthenticatedDashboard } from "./pages/dashboard/AuthenticatedDashboard";
import StatsPage from "./pages/stats/StatsPage";
import PostTrendsPage from "./pages/postTrends/PostTrendsPage";
import NotificationsPage from "./pages/notifications/NotificationsPage";
import PoliciesPage from "./pages/policies/PoliciesPage";

function App() {
  return (
    <Admin
      title="HỆ THỐNG QUẢN TRỊ KCONNECTA"
      basename={import.meta.env.VITE_BASENAME ?? ""}
      dataProvider={dataProvider}
      authProvider={authProvider}
      i18nProvider={i18nProvider}
      dashboard={AuthenticatedDashboard}
      requireAuth
    >
      <CustomRoutes>
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/post-trends" element={<PostTrendsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/policies" element={<PoliciesPage />} />
      </CustomRoutes>
      <Resource {...customers} />
      <Resource {...activityLogs} />
      <Resource {...conversations} />
      <Resource {...posts} />
      <Resource {...postReports} />
      <Resource {...comments} />
    </Admin>
  );
}

export default App;
