import {
  QueryClient,
  QueryClientProvider,
  useIsFetching,
  useIsMutating,
} from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { useEffect } from "react";
import { useRouterAuth } from "./hooks/use-router-auth.ts";
import { router } from "./router.ts";
import { useUIStore } from "./stores/ui-store.ts";

const queryClient = new QueryClient();

export function App() {
  const { auth, hasHydrated } = useRouterAuth();

  if (!hasHydrated) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <QueryLoadingOverlay />
      <RouterProvider context={{ auth }} router={router} />
    </QueryClientProvider>
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
