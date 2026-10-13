import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { LogoutUserUseCase } from "@modules/auth/application/logout-usecase.ts";
import AuthenticationError from "@modules/auth/domain/error/index.ts";
import type { SessionRepository } from "@modules/auth/domain/session-repository.ts";
import { Result } from "@shared/domain/result.ts";

describe("LogoutUserUseCase", () => {
  const sessionRepository: jest.Mocked<SessionRepository> = {
    resolveSessionExpiration: jest.fn(),
    replaceActiveSession: jest.fn(),
    validateActiveSession: jest.fn(),
    revokeActiveSession: jest.fn(),
  };
  const useCase = new LogoutUserUseCase(sessionRepository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("revokes the authenticated session", async () => {
    sessionRepository.revokeActiveSession.mockResolvedValue(
      Result.success(true)
    );

    const result = await useCase.run("session-123", "user-123");

    expect(result.isSuccess).toBe(true);
    expect(sessionRepository.revokeActiveSession).toHaveBeenCalledWith({
      sessionId: "session-123",
      userId: "user-123",
    });
  });

  it("rejects a session that is no longer active", async () => {
    sessionRepository.revokeActiveSession.mockResolvedValue(
      Result.success(false)
    );

    const result = await useCase.run("session-123", "user-123");

    expect(result.isSuccess).toBe(false);
    expect(result.getError().statusCode).toBe(401);
  });

  it("propagates session revocation failures", async () => {
    const error = AuthenticationError.sessionRevocationFailed();
    sessionRepository.revokeActiveSession.mockResolvedValue(Result.fail(error));

    const result = await useCase.run("session-123", "user-123");

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBe(error);
  });
});
