import { cn } from "cn";
import { BellIcon, LayoutDashboardIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AppBreadcrumbs } from "./app-breadcrumbs";
import { CustomSidebarTrigger } from "./custom-sidebar-trigger";
import { NavUser } from "./nav-user";

export function AppHeader() {
  return (
    <header
      className={cn(
        "pxx-4 mb-6 flex items-center justify-between gap-2 md:px-2"
      )}
    >
      <div className="flex items-center gap-3">
        <CustomSidebarTrigger />
        <Separator
          className="mr-2 h-4 data-[orientation=vertical]:self-center"
          orientation="vertical"
        />
        <AppBreadcrumbs
          page={{
            icon: <LayoutDashboardIcon className="size-4" />,
            title: "Dashboard",
          }}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button aria-label="Notifications" size="icon" variant="ghost">
          <BellIcon />
        </Button>
        <Separator
          className="h-4 data-[orientation=vertical]:self-center"
          orientation="vertical"
        />
        <NavUser />
      </div>
    </header>
  );
}
