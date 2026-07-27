import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { useRouterAuth } from "./hooks/use-router-auth.ts";
import { router } from "./router.ts";

const queryClient = new QueryClient();

export function App() {
  const { auth, hasHydrated } = useRouterAuth();

  if (!hasHydrated) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider context={{ auth }} router={router} />
    </QueryClientProvider>
  );
}
