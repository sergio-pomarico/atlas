import { useEffect } from "react";
import { router } from "@/router";
import { useAuthStore } from "@/stores/auth-store";

export function useRouterAuth() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  useEffect(() => {
    if (hasHydrated) {
      router.invalidate();
    }
  }, [hasHydrated]);

  return {
    hasHydrated,
    auth: {
      isAuthenticated: accessToken !== null,
    },
  };
}
