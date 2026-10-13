import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { RefreshAccessTokenUseCase } from "@modules/auth/application/refresh-access-token-usecase.ts";
import AuthenticationError from "@modules/auth/domain/error/index.ts";
import type { SessionRepository } from "@modules/auth/domain/session-repository.ts";
import { Result } from "@shared/domain/result.ts";
import type { JWTService } from "@shared/infrastructure/services/jwt.ts";

const refreshToken = "refresh-token";
const refreshPayload = {
  sub: "user-123",
  scope: "refresh" as const,
  sid: "session-123",
  iat: 1,
  exp: 2,
  iss: "atlas-api" as const,
  aud: "atlas-client" as const,
};

describe("RefreshAccessTokenUseCase", () => {
  const jwtService = {
    sign: jest.fn() as jest.MockedFunction<JWTService["sign"]>,
    verify: jest.fn() as jest.MockedFunction<JWTService["verify"]>,
  };
  const sessionRepository: jest.Mocked<SessionRepository> = {
    resolveSessionExpiration: jest.fn(),
    replaceActiveSession: jest.fn(),
    validateActiveSession: jest.fn(),
    revokeActiveSession: jest.fn(),
  };
  const useCase = new RefreshAccessTokenUseCase(
    jwtService as unknown as JWTService,
    sessionRepository
  );

  beforeEach(() => {
    jest.clearAllMocks();
    jwtService.verify.mockResolvedValue(refreshPayload);
    jwtService.sign.mockResolvedValue("new-access-token");
    sessionRepository.validateActiveSession.mockResolvedValue(
      Result.success(true)
    );
  });

  it("issues an access token for a valid refresh token and session", async () => {
    const result = await useCase.run(refreshToken);

    expect(result.isSuccess).toBe(true);
    expect(result.getData()).toEqual({ accessToken: "new-access-token" });
    expect(jwtService.verify).toHaveBeenCalledWith(refreshToken, "refresh");
    expect(sessionRepository.validateActiveSession).toHaveBeenCalledWith({
      sessionId: "session-123",
      userId: "user-123",
    });
    expect(jwtService.sign).toHaveBeenCalledWith(
      {
        sub: "user-123",
        scope: "access",
        sid: "session-123",
      },
      "access",
      { expiresIn: "5m" }
    );
    expect(sessionRepository.replaceActiveSession).not.toHaveBeenCalled();
  });

  it.each([
    null,
    { ...refreshPayload, scope: "access" },
    { ...refreshPayload, exp: undefined },
    { ...refreshPayload, sid: "" },
  ])("rejects invalid refresh claims %#", async (payload) => {
    jwtService.verify.mockResolvedValue(payload);

    const result = await useCase.run(refreshToken);

    expect(result.isSuccess).toBe(false);
    expect(result.getError().statusCode).toBe(401);
    expect(sessionRepository.validateActiveSession).not.toHaveBeenCalled();
    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  it("returns a controlled error when refresh verification rejects", async () => {
    jwtService.verify.mockRejectedValue(new Error("Secret manager failed"));

    const result = await useCase.run(refreshToken);

    expect(result.isSuccess).toBe(false);
    expect(result.getError().statusCode).toBe(500);
    expect(result.getError().message).toBe("Refresh token validation failed");
    expect(sessionRepository.validateActiveSession).not.toHaveBeenCalled();
  });

  it("rejects a session that is no longer active", async () => {
    sessionRepository.validateActiveSession.mockResolvedValue(
      Result.success(false)
    );

    const result = await useCase.run(refreshToken);

    expect(result.isSuccess).toBe(false);
    expect(result.getError().statusCode).toBe(401);
    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  it("propagates session validation failures", async () => {
    const error = AuthenticationError.sessionValidationFailed();
    sessionRepository.validateActiveSession.mockResolvedValue(
      Result.fail(error)
    );

    const result = await useCase.run(refreshToken);

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBe(error);
    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  it("returns a controlled error when access signing rejects", async () => {
    jwtService.sign.mockRejectedValue(new Error("Signing failed"));

    const result = await useCase.run(refreshToken);

    expect(result.isSuccess).toBe(false);
    expect(result.getError().statusCode).toBe(500);
    expect(result.getError().message).toBe("Token generation failed");
  });

  it.each([null, ""])(
    "returns a controlled error when access signing returns %p",
    async (token) => {
      jwtService.sign.mockResolvedValue(token);

      const result = await useCase.run(refreshToken);

      expect(result.isSuccess).toBe(false);
      expect(result.getError().statusCode).toBe(500);
    }
  );
});
