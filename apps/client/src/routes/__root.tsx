import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { LoadingOverlay } from "@/components/ui/loading";
import { useUIStore } from "@/stores/ui-store";

export interface RouterContext {
  auth: {
    isAuthenticated: boolean;
  };
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

function RootLayout() {
  const isLoading = useUIStore((state) => state.isLoading);
  const loadingMessage = useUIStore((state) => state.loadingMessage);
  return (
    <>
      <Outlet />
      <LoadingOverlay isVisible={isLoading} message={loadingMessage} />
    </>
  );
}
