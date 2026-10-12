import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import AuthenticationError from "@modules/auth/domain/error/index.ts";
import type { SessionRepository } from "@modules/auth/domain/session-repository.ts";
import { AuthMiddleware } from "@modules/auth/presentation/auth-middleware.ts";
import { Result } from "@shared/domain/result.ts";
import type { JWTService } from "@shared/infrastructure/services/jwt.ts";
import type { NextFunction, Request, Response } from "express";

describe("AuthMiddleware", () => {
  const jwtService = {
    verify: jest.fn(),
    sign: jest.fn(),
  } as unknown as jest.Mocked<JWTService>;
  const sessionValidator: jest.Mocked<
    Pick<SessionRepository, "validateActiveSession">
  > = {
    validateActiveSession: jest.fn(),
  };
  const middleware = new AuthMiddleware(jwtService, sessionValidator);

  beforeEach(() => {
    jest.clearAllMocks();
    sessionValidator.validateActiveSession.mockResolvedValue(
      Result.success(false)
    );
  });

  it.each([
    [undefined, null],
    ["token", null],
    ["token", { sub: "user", email: "test@example.com", scope: "access" }],
    [
      "token",
      { sub: "user", email: "test@example.com", scope: "access", sid: 1 },
    ],
    ["token", { sub: "user", email: "test@example.com", scope: "refresh" }],
  ])(
    "rejects missing, invalid, or malformed access tokens",
    async (authorization, payload) => {
      jwtService.verify.mockResolvedValue(payload);
      const { next, req } = await run(authorization);
      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
      expect(next).not.toHaveBeenCalledWith();
      expect(req.auth).toBeUndefined();
    }
  );

  it("propagates repository failures and does not continue", async () => {
    jwtService.verify.mockResolvedValue(accessToken());
    const error = AuthenticationError.sessionValidationFailed();
    sessionValidator.validateActiveSession.mockResolvedValue(
      Result.fail(error)
    );
    const { next } = await run("token");
    expect(next).toHaveBeenCalledWith(error);
    expect(next).not.toHaveBeenCalledWith();
  });

  it("rejects an invalid session without continuing", async () => {
    jwtService.verify.mockResolvedValue(accessToken());
    const { next } = await run("token");
    expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("assigns typed auth data only after a valid session", async () => {
    jwtService.verify.mockResolvedValue(accessToken());
    sessionValidator.validateActiveSession.mockResolvedValue(
      Result.success(true)
    );
    const { next, req } = await run("raw-token");
    expect(sessionValidator.validateActiveSession).toHaveBeenCalledWith({
      sessionId: "session",
      userId: "user",
    });
    expect(req.auth).toEqual({
      userId: "user",
      sessionId: "session",
      scope: "access",
    });
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  async function run(authorization?: string, payload?: unknown) {
    if (payload !== undefined) {
      jwtService.verify.mockResolvedValue(payload);
    }
    const req = { headers: authorization ? { authorization } : {} } as Request;
    const next = jest.fn();
    await middleware.require("access")(
      req,
      {} as Response,
      next as NextFunction
    );
    return { next, req };
  }
});

function accessToken() {
  return {
    sub: "user",
    scope: "access" as const,
    sid: "session",
    iat: 1,
    exp: 2,
    iss: "atlas-api",
    aud: "atlas-client",
  };
}
