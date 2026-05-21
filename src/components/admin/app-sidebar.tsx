import { createElement } from "react";
import {
  useCanAccess,
  useCreatePath,
  useGetResourceLabel,
  useHasDashboard,
  useResourceDefinitions,
  useTranslate,
} from "ra-core";
import { Link, useMatch } from "react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { House, List, BarChart3, Bell } from "lucide-react";
import logoV1 from "@/assets/LogoKConnecta_V1.png";
import logoV2 from "@/assets/LogoKConnecta_V2.png";

/**
 * Navigation sidebar displaying menu items, allowing users to navigate between different sections of the application.
 *
 * The sidebar can collapse to an icon-only view and renders as a collapsible drawer on mobile devices.
 * It automatically includes links to the dashboard (if defined) and all list views defined in Resource components.
 *
 * Included in the default Layout component
 *
 * @see {@link https://marmelab.com/shadcn-admin-kit/docs/appsidebar AppSidebar documentation}
 * @see {@link https://ui.shadcn.com/docs/components/sidebar shadcn/ui Sidebar component}
 * @see layout.tsx
 */
export function AppSidebar() {
  const hasDashboard = useHasDashboard();
  const resources = useResourceDefinitions();
  const { openMobile, setOpenMobile } = useSidebar();
  const handleClick = () => {
    if (openMobile) {
      setOpenMobile(false);
    }
  };
  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link to="/">
                <img src={logoV2} alt="KConnecta" className="!size-7 shrink-0 object-contain group-data-[collapsible=icon]:block hidden" />
                <img src={logoV1} alt="KConnecta" className="h-8 w-auto group-data-[collapsible=icon]:hidden" />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {hasDashboard ? (
                <DashboardMenuItem onClick={handleClick} />
              ) : null}
              <StatsMenuItem onClick={handleClick} />
              <NotificationsMenuItem onClick={handleClick} />
              {Object.keys(resources)
                .filter((name) => resources[name].hasList)
                .map((name) => (
                  <ResourceMenuItem
                    key={name}
                    name={name}
                    onClick={handleClick}
                  />
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}

/**
 * Menu item for the dashboard link in the sidebar.
 *
 * This component renders a sidebar menu item that links to the dashboard page.
 * It displays as active when the user is on the dashboard route.
 *
 * @example
 * <DashboardMenuItem onClick={handleClick} />
 */
export const DashboardMenuItem = ({ onClick }: { onClick?: () => void }) => {
  const translate = useTranslate();
  const label = translate("ra.page.dashboard", {
    _: "Dashboard",
  });
  const match = useMatch({ path: "/", end: true });
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={!!match}>
        <Link to="/" onClick={onClick}>
          <House />
          {label}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

/**
 * Menu item for a resource link in the sidebar.
 *
 * This component renders a sidebar menu item that links to a resource's list view.
 * It checks permissions using canAccess and displays as active when the user is viewing that resource.
 * The component icon and label are derived from the resource definition.
 *
 * @example
 * <ResourceMenuItem key={name} name="posts" onClick={handleClick} />
 */
export const StatsMenuItem = ({ onClick }: { onClick?: () => void }) => {
  const match = useMatch({ path: "/stats", end: false });
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={!!match}>
        <Link to="/stats" onClick={onClick}>
          <BarChart3 />
          Thống kê &amp; Báo cáo
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

export const NotificationsMenuItem = ({ onClick }: { onClick?: () => void }) => {
  const match = useMatch({ path: "/notifications", end: false });
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={!!match}>
        <Link to="/notifications" onClick={onClick}>
          <Bell />
          Thông báo
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

export const ResourceMenuItem = ({
  name,
  onClick,
}: {
  name: string;
  onClick?: () => void;
}) => {
  const { canAccess, isPending } = useCanAccess({
    resource: name,
    action: "list",
  });
  const resources = useResourceDefinitions();
  const getResourceLabel = useGetResourceLabel();
  const createPath = useCreatePath();
  const to = createPath({
    resource: name,
    type: "list",
  });
  const match = useMatch({ path: to, end: false });

  if (isPending) {
    return <Skeleton className="h-8 w-full" />;
  }

  if (!resources || !resources[name] || !canAccess) return null;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={!!match}>
        <Link to={to} state={{ _scrollToTop: true }} onClick={onClick}>
          {resources[name].icon ? (
            createElement(resources[name].icon)
          ) : (
            <List />
          )}
          {getResourceLabel(name, 2)}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};
