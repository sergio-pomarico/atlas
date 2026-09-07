import type { UserEntity } from "@atlas/entities/user.ts";
import { UserStatus } from "@atlas/entities/user.ts";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  type LoginInput,
  LoginUserUseCase,
} from "@modules/auth/application/login-usecase.ts";
import AuthenticationError from "@modules/auth/domain/error.ts";
import type { PasswordHasher } from "@modules/auth/domain/password-hasher.ts";
import type { AuthRepository } from "@modules/auth/domain/repository.ts";
import type { SessionRepository } from "@modules/auth/domain/session-repository.ts";
import { User } from "@modules/auth/domain/user.ts";
import { Result } from "@shared/domain/result.ts";
import type { JWTService } from "@shared/infrastructure/services/jwt.ts";

const authRepository: jest.Mocked<AuthRepository> = {
  findByEmail: jest.fn(),
  increaseFailedLoginAttempts: jest.fn(),
  resetFailedLoginAttempts: jest.fn(),
};
const sessionRepository: jest.Mocked<SessionRepository> = {
  replaceActiveSession: jest.fn(),
};
const passwordHasher: jest.Mocked<PasswordHasher> = {
  hash: jest.fn(),
  compare: jest.fn(),
};
const jwtService = {
  sign: jest.fn() as jest.MockedFunction<JWTService["sign"]>,
  verify: jest.fn() as jest.MockedFunction<JWTService["verify"]>,
};

const userEntity: UserEntity = {
  id: "user-123",
  email: "test@example.com",
  phone: "1234567890",
  password: "hashed-password",
  verified: true,
  status: UserStatus.ACTIVE,
  failedLoginAttempts: 2,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};
const input: LoginInput = {
  email: "test@example.com",
  password: "Password123!",
  ipAddress: "127.0.0.1",
  userAgent: "Atlas test client",
};

describe("LoginUserUseCase", () => {
  let useCase: LoginUserUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    authRepository.findByEmail.mockResolvedValue(
      Result.success(new User(userEntity))
    );
    authRepository.increaseFailedLoginAttempts.mockResolvedValue(
      Result.success(undefined)
    );
    authRepository.resetFailedLoginAttempts.mockResolvedValue(
      Result.success(undefined)
    );
    passwordHasher.compare.mockResolvedValue(true);
    jwtService.sign.mockResolvedValue("access-token");
    sessionRepository.replaceActiveSession.mockResolvedValue(
      Result.success(undefined)
    );
    useCase = new LoginUserUseCase(
      authRepository,
      passwordHasher,
      jwtService as unknown as JWTService,
      sessionRepository,
      30
    );
  });

  it("returns an access token for valid credentials", async () => {
    const result = await useCase.run(input);

    expect(result.isSuccess).toBe(true);
    expect(result.getData()).toEqual({ accessToken: "access-token" });
    expect(authRepository.findByEmail).toHaveBeenCalledWith("test@example.com");
    expect(passwordHasher.compare).toHaveBeenCalledWith(
      "Password123!",
      "hashed-password"
    );
    expect(jwtService.sign).toHaveBeenCalledWith(
      { sub: "user-123", email: "test@example.com", scope: "access" },
      "access",
      { expiresIn: "5m" }
    );
    expect(sessionRepository.replaceActiveSession).toHaveBeenCalledWith({
      userId: "user-123",
      ipAddress: "127.0.0.1",
      userAgent: "Atlas test client",
      sessionTtlDays: 30,
    });
  });

  it("resets failed attempts before signing and replacing the session", async () => {
    await useCase.run(input);

    const resetOrder = authRepository.resetFailedLoginAttempts.mock
      .invocationCallOrder[0] as number;
    const jwtOrder = jwtService.sign.mock.invocationCallOrder[0] as number;
    const sessionOrder = sessionRepository.replaceActiveSession.mock
      .invocationCallOrder[0] as number;
    expect(resetOrder).toBeLessThan(jwtOrder);
    expect(jwtOrder).toBeLessThan(sessionOrder);
  });

  it("propagates findByEmail failure without side effects", async () => {
    const error = AuthenticationError.userNotFound(
      "Invalid credentials",
      "The provided email or password is incorrect"
    );
    authRepository.findByEmail.mockResolvedValue(Result.fail(error));

    const result = await useCase.run(input);

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBe(error);
    expectNoAuthenticationSideEffects();
  });

  it.each([
    ["inactive", { status: UserStatus.INACTIVE }],
    ["blocked", { status: UserStatus.BLOCKED }],
    ["unverified", { verified: false }],
  ])("rejects a %s user without side effects", async (_label, overrides) => {
    authRepository.findByEmail.mockResolvedValue(
      Result.success(new User({ ...userEntity, ...overrides }))
    );

    const result = await useCase.run(input);

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBeInstanceOf(AuthenticationError);
    expectNoAuthenticationSideEffects();
  });

  it("returns an internal error when password comparison rejects", async () => {
    passwordHasher.compare.mockRejectedValue(new Error("Hasher failed"));

    const result = await useCase.run(input);

    expect(result.isSuccess).toBe(false);
    expect(result.getError().message).toBe("Password validation failed");
    expect(authRepository.increaseFailedLoginAttempts).not.toHaveBeenCalled();
    expect(authRepository.resetFailedLoginAttempts).not.toHaveBeenCalled();
    expect(jwtService.sign).not.toHaveBeenCalled();
    expect(sessionRepository.replaceActiveSession).not.toHaveBeenCalled();
  });

  it("increments attempts and does not create a session for an invalid password", async () => {
    passwordHasher.compare.mockResolvedValue(false);

    const result = await useCase.run(input);

    expect(result.isSuccess).toBe(false);
    expect(result.getError().message).toBe("Invalid credentials");
    expect(authRepository.increaseFailedLoginAttempts).toHaveBeenCalledWith(
      "user-123"
    );
    expect(authRepository.resetFailedLoginAttempts).not.toHaveBeenCalled();
    expect(jwtService.sign).not.toHaveBeenCalled();
    expect(sessionRepository.replaceActiveSession).not.toHaveBeenCalled();
  });

  it("preserves invalid-credentials behavior when incrementing attempts fails", async () => {
    passwordHasher.compare.mockResolvedValue(false);
    authRepository.increaseFailedLoginAttempts.mockResolvedValue(
      Result.fail(
        AuthenticationError.internalServerError(
          "Increment failed",
          "Increment failed"
        )
      )
    );

    const result = await useCase.run(input);

    expect(result.isSuccess).toBe(false);
    expect(result.getError().message).toBe("Invalid credentials");
    expect(jwtService.sign).not.toHaveBeenCalled();
    expect(sessionRepository.replaceActiveSession).not.toHaveBeenCalled();
  });

  it("propagates reset failure before JWT and session creation", async () => {
    const error = AuthenticationError.internalServerError(
      "Reset failed",
      "Could not reset failed login attempts"
    );
    authRepository.resetFailedLoginAttempts.mockResolvedValue(
      Result.fail(error)
    );

    const result = await useCase.run(input);

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBe(error);
    expect(jwtService.sign).not.toHaveBeenCalled();
    expect(sessionRepository.replaceActiveSession).not.toHaveBeenCalled();
  });

  it("returns a controlled error when JWT signing rejects", async () => {
    jwtService.sign.mockRejectedValue(new Error("JWT failed"));

    const result = await useCase.run(input);

    expect(result.isSuccess).toBe(false);
    expect(result.getError().message).toBe("Token generation failed");
    expect(authRepository.resetFailedLoginAttempts).toHaveBeenCalledWith(
      "user-123"
    );
    expect(authRepository.increaseFailedLoginAttempts).not.toHaveBeenCalled();
    expect(sessionRepository.replaceActiveSession).not.toHaveBeenCalled();
  });

  it.each([null, ""])(
    "returns a controlled error when JWT signing returns %p",
    async (token) => {
      jwtService.sign.mockResolvedValue(token);

      const result = await useCase.run(input);

      expect(result.isSuccess).toBe(false);
      expect(result.getError().message).toBe("Token generation failed");
      expect(authRepository.resetFailedLoginAttempts).toHaveBeenCalledWith(
        "user-123"
      );
      expect(sessionRepository.replaceActiveSession).not.toHaveBeenCalled();
    }
  );

  it("does not return the signed token when session replacement fails", async () => {
    const error = AuthenticationError.internalServerError(
      "Session failed",
      "Session failed"
    );
    sessionRepository.replaceActiveSession.mockResolvedValue(
      Result.fail(error)
    );

    const result = await useCase.run(input);

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBe(error);
    expect(authRepository.resetFailedLoginAttempts).toHaveBeenCalled();
    expect(jwtService.sign).toHaveBeenCalled();
  });

  function expectNoAuthenticationSideEffects(): void {
    expect(passwordHasher.compare).not.toHaveBeenCalled();
    expect(authRepository.increaseFailedLoginAttempts).not.toHaveBeenCalled();
    expect(authRepository.resetFailedLoginAttempts).not.toHaveBeenCalled();
    expect(jwtService.sign).not.toHaveBeenCalled();
    expect(sessionRepository.replaceActiveSession).not.toHaveBeenCalled();
  }
});
