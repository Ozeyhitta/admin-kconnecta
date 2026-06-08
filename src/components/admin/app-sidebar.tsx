import { createElement, useEffect, useState } from "react";
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
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { House, List, BarChart3, Bell, ScrollText, TrendingUp, ShieldAlert } from "lucide-react";
import logoV1 from "@/assets/LogoKConnecta_V1.png";
import logoV2 from "@/assets/LogoKConnecta_V2.png";
import { apiClient } from "@/services/axiosInstance";

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
                <img
                  src={logoV2}
                  alt="KConnecta"
                  className="!size-7 shrink-0 object-contain group-data-[collapsible=icon]:block hidden"
                />
                <img
                  src={logoV1}
                  alt="KConnecta"
                  className="h-8 w-auto group-data-[collapsible=icon]:hidden"
                />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Quản lý dữ liệu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {hasDashboard ? <DashboardMenuItem onClick={handleClick} /> : null}
              <StatsMenuItem onClick={handleClick} />
              <PostTrendsMenuItem onClick={handleClick} />
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
      <SidebarFooter>
        <SidebarMenu>
          <ModerationConfigMenuItem onClick={handleClick} />
          <PoliciesMenuItem onClick={handleClick} />
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

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

export const PostTrendsMenuItem = ({ onClick }: { onClick?: () => void }) => {
  const match = useMatch({ path: "/post-trends", end: false });
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={!!match}>
        <Link to="/post-trends" onClick={onClick}>
          <TrendingUp />
          Phân tích xu hướng
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

export const NotificationsMenuItem = ({ onClick }: { onClick?: () => void }) => {
  const match = useMatch({ path: "/notifications", end: false });
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await apiClient.get<{ count: number }>(
          "/api/v1/admin/notifications/inbox-count",
        );
        if (!cancelled) setReviewCount(data?.count ?? 0);
      } catch {
        if (!cancelled) setReviewCount(0);
      }
    };
    void load();
    const timer = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={!!match}>
        <Link to="/notifications" onClick={onClick} className="relative">
          <Bell />
          Thông báo
          {reviewCount > 0 && (
            <span
              className="absolute right-1 top-1/2 flex h-4 min-w-4 -translate-y-1/2 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground shadow-sm"
              aria-label={`${reviewCount > 9 ? "hơn 9" : reviewCount} thông báo chờ xử lý`}
            >
              {reviewCount > 9 ? "9+" : reviewCount}
            </span>
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

export const ModerationConfigMenuItem = ({ onClick }: { onClick?: () => void }) => {
  const match = useMatch({ path: "/moderation-config", end: false });
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={!!match}>
        <Link to="/moderation-config" onClick={onClick}>
          <ShieldAlert />
          Cấu hình kiểm duyệt
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

export const PoliciesMenuItem = ({ onClick }: { onClick?: () => void }) => {
  const match = useMatch({ path: "/policies", end: false });
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={!!match}>
        <Link to="/policies" onClick={onClick}>
          <ScrollText />
          Chính sách
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
          {resources[name].icon ? createElement(resources[name].icon) : <List />}
          {getResourceLabel(name, 2)}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};
