import { useQueryClient } from "@tanstack/react-query";
import { AxiosHeaders, type AxiosRequestConfig, isAxiosError } from "axios";
import { useEffect, useState } from "react";
import { router } from "@/router";
import { AuthServiceError, authService } from "@/services/auth-service";
import { apiClient } from "@/shared/axios/api-client";
import { useAuthStore } from "@/stores/auth-store";

type RetryableConfig = AxiosRequestConfig & {
  _hasRetriedAfterRefresh?: boolean;
};

class RefreshAccessTokenError extends Error {
  constructor(cause: unknown) {
    super("Unable to refresh the access token.", { cause });
    this.name = "RefreshAccessTokenError";
  }
}

export function isNonRetryableAuthError(error: unknown): boolean {
  return (
    error instanceof RefreshAccessTokenError ||
    (isAxiosError(error) && error.response?.status === 401)
  );
}

export function useAuthRefresh() {
  const queryClient = useQueryClient();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let refreshRequest: Promise<void> | null = null;
    const interceptorId = apiClient.interceptors.response.use(
      undefined,
      async (error) => {
        if (
          !isAxiosError(error) ||
          error.response?.status !== 401 ||
          !error.config
        ) {
          throw error;
        }

        const config = error.config as RetryableConfig;
        const accessToken = useAuthStore.getState().accessToken;
        if (!accessToken || config._hasRetriedAfterRefresh) {
          throw error;
        }

        config._hasRetriedAfterRefresh = true;
        const requestToken =
          config.headers instanceof AxiosHeaders
            ? config.headers.get("Authorization")
            : undefined;
        if (requestToken !== accessToken) {
          return apiClient.request(config);
        }

        refreshRequest ??= authService
          .refreshAccessToken()
          .then(({ accessToken: refreshedAccessToken }) => {
            useAuthStore.getState().setAccessToken(refreshedAccessToken);
          })
          .catch(async (refreshError) => {
            if (
              refreshError instanceof AuthServiceError &&
              [401, 403].includes(refreshError.status ?? 0)
            ) {
              useAuthStore.getState().clearSession();
              queryClient.clear();
              await router.invalidate();
              await router.navigate({ replace: true, to: "/login" });
            }
            throw new RefreshAccessTokenError(refreshError);
          })
          .finally(() => {
            refreshRequest = null;
          });

        await refreshRequest;
        return apiClient.request(config);
      }
    );
    setIsReady(true);

    return () => apiClient.interceptors.response.eject(interceptorId);
  }, [queryClient]);

  return isReady;
}
