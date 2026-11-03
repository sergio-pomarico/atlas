import type { LoginPayload } from "@atlas/schemas/lib/auth/login.ts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HTTPClientConfig } from "@/shared/axios/axios";

const { apiClientDeleteMock, httpClientConstructor, postMock } = vi.hoisted(
  () => ({
    apiClientDeleteMock: vi.fn(),
    httpClientConstructor: vi.fn(),
    postMock: vi.fn(),
  })
);

vi.mock("@/shared/axios/axios", () => ({
  HTTPClient: class {
    post = postMock;

    constructor(config: unknown) {
      httpClientConstructor(config);
    }
  },
}));

vi.mock("@/shared/axios/api-client", () => ({
  apiClient: {
    delete: apiClientDeleteMock,
  },
}));

import { AuthService, AuthServiceError } from "../auth-service";

const config: HTTPClientConfig = {
  baseURL: "https://api.example.test/api",
};
const payload: LoginPayload = {
  email: "user@example.test",
  password: "Password123!",
};
const authErrorCases = [
  {
    name: "401 response",
    error: {
      isAxiosError: true,
      message: "Request failed with status code 401",
      response: {
        status: 401,
        data: {
          message: "Authentication is required",
          error: { code: "UNAUTHORIZED" },
        },
      },
    },
    expected: {
      status: 401,
      code: "UNAUTHORIZED",
      message: "Authentication is required",
    },
  },
  {
    name: "403 response",
    error: {
      isAxiosError: true,
      message: "Request failed with status code 403",
      response: {
        status: 403,
        data: {
          message: "The requested action is forbidden",
          error: { code: "FORBIDDEN" },
        },
      },
    },
    expected: {
      status: 403,
      code: "FORBIDDEN",
      message: "The requested action is forbidden",
    },
  },
  {
    name: "network error",
    error: {
      isAxiosError: true,
      code: "ERR_NETWORK",
      message: "Network Error",
    },
    expected: {
      status: undefined,
      code: "ERR_NETWORK",
      message: "Network Error",
    },
  },
  {
    name: "timeout",
    error: {
      isAxiosError: true,
      code: "ECONNABORTED",
      message: "timeout of 30000ms exceeded",
    },
    expected: {
      status: undefined,
      code: "ECONNABORTED",
      message: "timeout of 30000ms exceeded",
    },
  },
  {
    name: "503 response",
    error: {
      isAxiosError: true,
      message: "Request failed with status code 503",
      response: {
        status: 503,
        data: {
          message: "The authentication service is unavailable",
          error: { code: "SERVICE_UNAVAILABLE" },
        },
      },
    },
    expected: {
      status: 503,
      code: "SERVICE_UNAVAILABLE",
      message: "The authentication service is unavailable",
    },
  },
];
const authOperations = [
  {
    name: "refresh access token",
    method: (authService: AuthService) => authService.refreshAccessToken(),
    mock: postMock,
  },
  {
    name: "logout",
    method: (authService: AuthService) => authService.logout(),
    mock: apiClientDeleteMock,
  },
];

describe("AuthService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("constructs an HTTP client with its configuration", () => {
    new AuthService(config);

    expect(httpClientConstructor).toHaveBeenCalledWith(config);
  });

  it("posts the login payload and returns only the access token", async () => {
    postMock.mockResolvedValue({
      data: {
        status: "success",
        message: "User logged in successfully",
        data: {
          accessToken: "access-token",
        },
      },
    });
    const authService = new AuthService(config);

    await expect(authService.login(payload)).resolves.toEqual({
      accessToken: "access-token",
    });
    expect(postMock).toHaveBeenCalledWith("/auth/login", payload);
  });

  it("refreshes with the cookie-enabled unauthenticated client and returns only the access token", async () => {
    postMock.mockResolvedValue({
      data: {
        status: "success",
        message: "Access token refreshed successfully",
        data: {
          accessToken: "refreshed-access-token",
          ignored: "response data is not exposed",
        },
      },
    });
    const cookieConfig: HTTPClientConfig = {
      ...config,
      withCredentials: true,
    };
    const authService = new AuthService(cookieConfig);

    await expect(authService.refreshAccessToken()).resolves.toEqual({
      accessToken: "refreshed-access-token",
    });
    expect(httpClientConstructor).toHaveBeenCalledWith(cookieConfig);
    expect(postMock).toHaveBeenCalledWith("/auth/refresh", undefined);
    expect(apiClientDeleteMock).not.toHaveBeenCalled();
  });

  it("logs out through the authenticated API client without reading the empty response body", async () => {
    const response = {
      status: 204,
      get data() {
        throw new Error("Logout must not read a 204 response body");
      },
    };
    apiClientDeleteMock.mockResolvedValue(response);
    const authService = new AuthService(config);

    await expect(authService.logout()).resolves.toBeUndefined();
    expect(apiClientDeleteMock).toHaveBeenCalledWith("/auth/logout");
    expect(postMock).not.toHaveBeenCalled();
  });

  it.each([
    {
      error: {
        isAxiosError: true,
        message: "Request failed with status code 400",
        response: {
          status: 400,
          data: {
            message: "Invalid credentials",
            error: { code: "BAD_REQUEST" },
          },
        },
      },
      expected: {
        status: 400,
        code: "BAD_REQUEST",
        message: "Invalid credentials",
      },
    },
    {
      error: {
        isAxiosError: true,
        message: "Request failed with status code 403",
        response: {
          status: 403,
          data: {
            message: "User is not allowed to log in",
            error: { code: "FORBIDDEN" },
          },
        },
      },
      expected: {
        status: 403,
        code: "FORBIDDEN",
        message: "User is not allowed to log in",
      },
    },
    {
      error: {
        isAxiosError: true,
        code: "ERR_NETWORK",
        message: "Network Error",
      },
      expected: {
        code: "ERR_NETWORK",
        message: "Network Error",
      },
    },
    {
      error: {
        isAxiosError: true,
        code: "ECONNABORTED",
        message: "timeout of 30000ms exceeded",
      },
      expected: {
        code: "ECONNABORTED",
        message: "timeout of 30000ms exceeded",
      },
    },
  ])("normalizes login failures into AuthServiceError", async ({
    error,
    expected,
  }) => {
    postMock.mockRejectedValue(error);
    const authService = new AuthService(config);

    await expect(authService.login(payload)).rejects.toMatchObject({
      name: "AuthServiceError",
      ...expected,
    });
    await expect(authService.login(payload)).rejects.toBeInstanceOf(
      AuthServiceError
    );
  });

  describe.each(authOperations)("$name", ({ method, mock }) => {
    it.each(
      authErrorCases
    )("normalizes $name failures into AuthServiceError", async ({
      error,
      expected,
    }) => {
      mock.mockRejectedValue(error);
      const authService = new AuthService(config);
      const request = method(authService);

      await expect(request).rejects.toBeInstanceOf(AuthServiceError);
      await expect(request).rejects.toMatchObject({
        name: "AuthServiceError",
        ...expected,
      });
    });
  });
});
