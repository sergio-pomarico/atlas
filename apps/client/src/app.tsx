import {
  QueryClient,
  QueryClientProvider,
  useIsFetching,
  useIsMutating,
} from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  isNonRetryableAuthError,
  useAuthRefresh,
} from "./hooks/use-auth-refresh.ts";
import { useRouterAuth } from "./hooks/use-router-auth.ts";
import { router } from "./router.ts";
import { useUIStore } from "./stores/ui-store.ts";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) =>
        !isNonRetryableAuthError(error) && failureCount < 3,
    },
  },
});

export function App() {
  const { auth, hasHydrated } = useRouterAuth();

  if (!hasHydrated) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppContent auth={auth} />
    </QueryClientProvider>
  );
}

function AppContent({ auth }: { auth: { isAuthenticated: boolean } }) {
  const isReady = useAuthRefresh();

  if (!isReady) {
    return null;
  }

  return (
    <>
      <QueryLoadingOverlay />
      <RouterProvider context={{ auth }} router={router} />
    </>
  );
}

function QueryLoadingOverlay() {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const setLoading = useUIStore((state) => state.setLoading);

  useEffect(() => {
    setLoading(isFetching > 0 || isMutating > 0);
  }, [isFetching, isMutating, setLoading]);

  return null;
}
