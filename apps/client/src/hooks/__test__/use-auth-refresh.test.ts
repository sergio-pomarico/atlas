import { AxiosHeaders } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  let accessToken: string | null = "old-token";
  return {
    clearQueryCache: vi.fn(),
    clearSession: vi.fn(() => {
      accessToken = null;
    }),
    eject: vi.fn(),
    getAccessToken: () => accessToken,
    invalidate: vi.fn().mockResolvedValue(undefined),
    navigate: vi.fn().mockResolvedValue(undefined),
    onRejected: vi.fn(),
    refreshAccessToken: vi.fn(),
    request: vi.fn(),
    setAccessToken: vi.fn((token: string) => {
      accessToken = token;
    }),
    setReady: vi.fn(),
    setToken: (token: string | null) => {
      accessToken = token;
    },
  };
});

vi.mock("react", () => ({
  useEffect: (effect: () => undefined | (() => void)) => effect(),
  useState: (value: boolean) => [value, mocks.setReady],
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ clear: mocks.clearQueryCache }),
}));

vi.mock("@/shared/axios/api-client", () => ({
  apiClient: {
    interceptors: {
      response: {
        eject: mocks.eject,
        use: vi.fn((_fulfilled, onRejected) => {
          mocks.onRejected.mockImplementation(onRejected);
          return 1;
        }),
      },
    },
    request: mocks.request,
  },
}));

vi.mock("@/services/auth-service", () => ({
  AuthServiceError: class AuthServiceError extends Error {
    status?: number;

    constructor({ message, status }: { message: string; status?: number }) {
      super(message);
      this.status = status;
    }
  },
  authService: { refreshAccessToken: mocks.refreshAccessToken },
}));

vi.mock("@/stores/auth-store", () => ({
  useAuthStore: {
    getState: () => ({
      accessToken: mocks.getAccessToken?.(),
      clearSession: mocks.clearSession,
      setAccessToken: mocks.setAccessToken,
    }),
  },
}));

vi.mock("@/router", () => ({
  router: { invalidate: mocks.invalidate, navigate: mocks.navigate },
}));

import { AuthServiceError } from "@/services/auth-service";
import { isNonRetryableAuthError, useAuthRefresh } from "../use-auth-refresh";

function unauthorized() {
  return {
    config: { headers: new AxiosHeaders({ Authorization: "old-token" }) },
    isAxiosError: true,
    response: { status: 401 },
  };
}

describe("useAuthRefresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.setToken("old-token");
    mocks.request.mockResolvedValue({ data: "retried" });
    mocks.refreshAccessToken.mockResolvedValue({ accessToken: "new-token" });
    useAuthRefresh();
  });

  it("shares refresh and replays requests after updating the token", async () => {
    const first = mocks.onRejected(unauthorized());
    const second = mocks.onRejected(unauthorized());

    await expect(Promise.all([first, second])).resolves.toEqual([
      { data: "retried" },
      { data: "retried" },
    ]);
    expect(mocks.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(mocks.setAccessToken).toHaveBeenCalledWith("new-token");
    expect(mocks.request).toHaveBeenCalledTimes(2);
  });

  it("propagates replay failures without wrapping or ending the session", async () => {
    const replayError = new Error("Replay failed");
    mocks.request.mockRejectedValue(replayError);

    await expect(mocks.onRejected(unauthorized())).rejects.toBe(replayError);
    expect(mocks.clearSession).not.toHaveBeenCalled();
  });

  it("classifies unauthorized and failed refresh errors as non-retryable", async () => {
    const refreshError = new Error("Refresh failed");
    mocks.refreshAccessToken.mockRejectedValue(refreshError);

    const failedRefresh = await mocks
      .onRejected(unauthorized())
      .catch((error: unknown) => error);

    expect(failedRefresh).toMatchObject({ name: "RefreshAccessTokenError" });
    expect(isNonRetryableAuthError(unauthorized())).toBe(true);
    expect(isNonRetryableAuthError(failedRefresh)).toBe(true);
    expect(isNonRetryableAuthError(new Error("Network failed"))).toBe(false);
  });

  it("clears the session for an invalid refresh", async () => {
    mocks.refreshAccessToken.mockRejectedValue(
      new AuthServiceError({ message: "Session expired", status: 401 })
    );

    await expect(mocks.onRejected(unauthorized())).rejects.toMatchObject({
      name: "RefreshAccessTokenError",
    });
    expect(mocks.clearSession).toHaveBeenCalledOnce();
    expect(mocks.clearQueryCache).toHaveBeenCalledOnce();
    expect(mocks.navigate).toHaveBeenCalledWith({
      replace: true,
      to: "/login",
    });
  });

  it("does not save a refreshed token after the session is cleared", async () => {
    let resolveRefresh: (value: { accessToken: string }) => void = () => {
      throw new Error("Refresh resolver was not initialized.");
    };
    mocks.refreshAccessToken.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRefresh = resolve;
        })
    );

    const request = mocks.onRejected(unauthorized());
    mocks.clearSession();
    resolveRefresh({ accessToken: "new-token" });

    await expect(request).rejects.toMatchObject({
      name: "RefreshAccessTokenError",
    });
    expect(mocks.setAccessToken).not.toHaveBeenCalled();
    expect(mocks.request).not.toHaveBeenCalled();
    expect(mocks.clearQueryCache).not.toHaveBeenCalled();
  });

  it("does not save a refreshed token after a new login", async () => {
    let resolveRefresh: (value: { accessToken: string }) => void = () => {
      throw new Error("Refresh resolver was not initialized.");
    };
    mocks.refreshAccessToken.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRefresh = resolve;
        })
    );

    const request = mocks.onRejected(unauthorized());
    mocks.setToken("new-login-token");
    resolveRefresh({ accessToken: "new-token" });

    await expect(request).rejects.toMatchObject({
      name: "RefreshAccessTokenError",
    });
    expect(mocks.setAccessToken).not.toHaveBeenCalled();
    expect(mocks.request).not.toHaveBeenCalled();
  });

  it.each([
    401, 403,
  ])("does not clear a new session when an old refresh returns %i", async (status) => {
    let rejectRefresh: (reason: unknown) => void = () => {
      throw new Error("Refresh rejecter was not initialized.");
    };
    mocks.refreshAccessToken.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectRefresh = reject;
        })
    );

    const request = mocks.onRejected(unauthorized());
    mocks.setToken("new-login-token");
    rejectRefresh(new AuthServiceError({ message: "Session expired", status }));

    await expect(request).rejects.toMatchObject({
      name: "RefreshAccessTokenError",
    });
    expect(mocks.clearSession).not.toHaveBeenCalled();
    expect(mocks.clearQueryCache).not.toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("does not replay after the session token changes during refresh", async () => {
    mocks.setAccessToken.mockImplementationOnce((token: string) => {
      mocks.setToken(token);
      mocks.setToken("new-login-token");
    });

    await expect(mocks.onRejected(unauthorized())).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(mocks.request).not.toHaveBeenCalled();
    expect(mocks.clearQueryCache).not.toHaveBeenCalled();
  });
});
