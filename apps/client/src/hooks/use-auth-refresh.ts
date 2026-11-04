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

function getRefreshableRequestConfig(error: unknown): RetryableConfig | null {
  if (!isAxiosError(error) || error.response?.status !== 401 || !error.config) {
    return null;
  }

  return error.config as RetryableConfig;
}

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
    let refreshRequest: Promise<string> | null = null;
    const interceptorId = apiClient.interceptors.response.use(
      undefined,
      async (error) => {
        const config = getRefreshableRequestConfig(error);
        if (!config) {
          throw error;
        }

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
            if (useAuthStore.getState().accessToken !== accessToken) {
              throw new RefreshAccessTokenError(
                new Error("Session changed while refreshing the access token.")
              );
            }
            useAuthStore.getState().setAccessToken(refreshedAccessToken);
            return refreshedAccessToken;
          })
          .catch(async (refreshError) => {
            if (refreshError instanceof RefreshAccessTokenError) {
              throw refreshError;
            }
            if (
              refreshError instanceof AuthServiceError &&
              [401, 403].includes(refreshError.status ?? 0) &&
              useAuthStore.getState().accessToken === accessToken
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

        const refreshedAccessToken = await refreshRequest;
        if (useAuthStore.getState().accessToken !== refreshedAccessToken) {
          throw error;
        }
        return apiClient.request(config);
      }
    );
    setIsReady(true);

    return () => apiClient.interceptors.response.eject(interceptorId);
  }, [queryClient]);

  return isReady;
}
