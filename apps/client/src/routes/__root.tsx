import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { ErrorToast } from "@/components/ui/error-toast";
import { LoadingOverlay } from "@/components/ui/loading";
import { Toaster } from "@/components/ui/sonner";
import { useUIStore } from "@/stores/ui-store";

interface RouterContext {
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
      <Toaster />
      <ErrorToast />
    </>
  );
}
