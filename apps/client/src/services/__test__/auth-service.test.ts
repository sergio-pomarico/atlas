import type { LoginPayload } from "@atlas/schemas/lib/auth/login.ts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HTTPClientConfig } from "@/shared/axios/axios";

const { httpClientConstructor, postMock } = vi.hoisted(() => ({
  httpClientConstructor: vi.fn(),
  postMock: vi.fn(),
}));

vi.mock("@/shared/axios/axios", () => ({
  HTTPClient: class {
    post = postMock;

    constructor(config: unknown) {
      httpClientConstructor(config);
    }
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
  ])(
    "normalizes login failures into AuthServiceError",
    async ({ error, expected }) => {
      postMock.mockRejectedValue(error);
      const authService = new AuthService(config);

      await expect(authService.login(payload)).rejects.toMatchObject({
        name: "AuthServiceError",
        ...expected,
      });
      await expect(authService.login(payload)).rejects.toBeInstanceOf(
        AuthServiceError
      );
    }
  );
});
