import { UserStatus } from "@atlas/entities/user.ts";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { ForgotPasswordUseCase } from "@modules/auth/application/forgot-password-usecase.ts";
import type { PasswordRecoveryRateLimiter } from "@modules/auth/application/ports/password-recovery-rate-limiter.ts";
import AuthenticationError from "@modules/auth/domain/error.ts";
import type { PasswordHasher } from "@modules/auth/domain/password-hasher.ts";
import type { PasswordRecoveryRepository } from "@modules/auth/domain/password-recovery-repository.ts";
import type { AuthRepository } from "@modules/auth/domain/repository.ts";
import { User } from "@modules/auth/domain/user.ts";
import { Result } from "@shared/domain/result.ts";
import type { EmailService } from "@shared/infrastructure/services/email.ts";
import type { Logger } from "@shared/infrastructure/services/logger.ts";
import { pick } from "@shared/utils/properties.ts";

const input = { email: "user@example.com", ip: "127.0.0.1" };
const SIX_DIGIT_CODE = /^\d{6}$/;
const passwordRecoveryUserStatuses = pick(UserStatus, [
  "ACTIVE",
  "INACTIVE",
  "BLOCKED",
  "DELETED",
]);
type PasswordRecoveryUserStatus =
  (typeof passwordRecoveryUserStatuses)[keyof typeof passwordRecoveryUserStatuses];

const user = (
  status: PasswordRecoveryUserStatus = UserStatus.ACTIVE,
  verified = true
) =>
  new User({
    id: "user-id",
    email: input.email,
    phone: "3011234567",
    password: "password-hash",
    status,
    verified,
    failedLoginAttempts: 0,
  });

const authRepository: jest.Mocked<AuthRepository> = {
  findByEmail: jest.fn(),
  increaseFailedLoginAttempts: jest.fn(),
  resetFailedLoginAttempts: jest.fn(),
  createPasswordResetRequest: jest.fn(),
  invalidatePasswordResetRequest: jest.fn(),
  findPasswordResetRequest: jest.fn(),
  registerFailedPasswordResetAttempt: jest.fn(),
  completePasswordReset: jest.fn(),
};

const recoveryRepository: jest.Mocked<PasswordRecoveryRepository> = {
  createPendingRequest: jest.fn(),
  activatePendingRequest: jest.fn(),
  invalidatePendingRequest: jest.fn(),
  cleanupAbandonedPendingRequests: jest.fn(),
};

const passwordHasher: jest.Mocked<PasswordHasher> = {
  hash: jest.fn(),
  compare: jest.fn(),
};

const rateLimiter: jest.Mocked<PasswordRecoveryRateLimiter> = {
  consumeForgotPassword: jest.fn(),
  clearResetPasswordEmailLimit: jest.fn(),
};

const emailService = {
  sendWithResult: jest.fn() as jest.MockedFunction<
    EmailService["sendWithResult"]
  >,
};

const logger = {
  error: jest.fn() as jest.MockedFunction<Logger["error"]>,
};

describe("ForgotPasswordUseCase", () => {
  let useCase: ForgotPasswordUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    rateLimiter.consumeForgotPassword.mockResolvedValue({
      allowed: true,
      blockingTtlMilliseconds: 0,
    });
    rateLimiter.clearResetPasswordEmailLimit.mockResolvedValue(true);
    authRepository.findByEmail.mockResolvedValue(Result.success(user()));
    passwordHasher.hash.mockResolvedValue("code-hash");
    recoveryRepository.createPendingRequest.mockResolvedValue({
      type: "created",
      requestId: "internal-request-id",
    });
    recoveryRepository.activatePendingRequest.mockResolvedValue({
      type: "activated",
    });
    recoveryRepository.invalidatePendingRequest.mockResolvedValue({
      type: "invalidated",
    });
    emailService.sendWithResult.mockResolvedValue({ accepted: true });
    useCase = new ForgotPasswordUseCase(
      authRepository,
      recoveryRepository,
      passwordHasher,
      emailService as unknown as EmailService,
      rateLimiter,
      logger as unknown as Logger
    );
  });

  it("returns 503 without lookup when the rate limiter is unavailable", async () => {
    rateLimiter.consumeForgotPassword.mockRejectedValue(
      new Error("redis down")
    );

    const result = await useCase.run(input);

    expect(result.isSuccess).toBe(false);
    expect(result.getError().statusCode).toBe(503);
    expect(authRepository.findByEmail).not.toHaveBeenCalled();
    expect(recoveryRepository.createPendingRequest).not.toHaveBeenCalled();
    expect(emailService.sendWithResult).not.toHaveBeenCalled();
  });

  it("returns a rate-limited result without clearing or looking up", async () => {
    rateLimiter.consumeForgotPassword.mockResolvedValue({
      allowed: false,
      blockingTtlMilliseconds: 12_345,
    });

    const result = await useCase.run(input);

    expect(result.isSuccess).toBe(false);
    expect(result.getError().statusCode).toBe(429);
    expect(rateLimiter.clearResetPasswordEmailLimit).not.toHaveBeenCalled();
    expect(authRepository.findByEmail).not.toHaveBeenCalled();
  });

  it("clears the reset quota before looking up the account", async () => {
    const calls: string[] = [];
    rateLimiter.clearResetPasswordEmailLimit.mockImplementation(() => {
      calls.push("clear");
      return Promise.resolve(true);
    });
    authRepository.findByEmail.mockImplementation(() => {
      calls.push("lookup");
      return Promise.resolve(Result.success(user()));
    });

    await useCase.run(input);

    expect(calls).toEqual(["clear", "lookup"]);
  });

  it("returns 503 without lookup when clearing the reset quota fails", async () => {
    rateLimiter.clearResetPasswordEmailLimit.mockRejectedValue(
      new Error("redis down")
    );

    const result = await useCase.run(input);

    expect(result.isSuccess).toBe(false);
    expect(result.getError().statusCode).toBe(503);
    expect(authRepository.findByEmail).not.toHaveBeenCalled();
  });

  it("returns the same generic result for missing and ineligible accounts", async () => {
    const missing = Result.fail<User, AuthenticationError>(missingUserError());
    authRepository.findByEmail.mockResolvedValue(missing);
    const missingResult = await useCase.run(input);

    authRepository.findByEmail.mockResolvedValue(
      Result.success(user(UserStatus.INACTIVE))
    );
    const ineligibleResult = await useCase.run(input);

    expect(missingResult).toEqual(ineligibleResult);
    expect(missingResult.getData()).toEqual({});
    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(recoveryRepository.createPendingRequest).not.toHaveBeenCalled();
    expect(emailService.sendWithResult).not.toHaveBeenCalled();
  });

  it("creates, sends, and activates an eligible request without exposing internal data", async () => {
    const result = await useCase.run(input);

    expect(result.isSuccess).toBe(true);
    expect(result.getData()).toEqual({});
    expect(passwordHasher.hash).toHaveBeenCalledWith(
      expect.stringMatching(SIX_DIGIT_CODE)
    );
    expect(recoveryRepository.createPendingRequest).toHaveBeenCalledWith(
      input.email,
      "code-hash",
      expect.any(Date)
    );
    expect(emailService.sendWithResult).toHaveBeenCalledWith(
      expect.objectContaining({ to: input.email })
    );
    expect(recoveryRepository.activatePendingRequest).toHaveBeenCalledWith(
      "internal-request-id",
      expect.any(Date)
    );
    expect(JSON.stringify(result.getData())).not.toContain("request");
  });

  it("returns a generic result and logs safely when hashing or persistence fails", async () => {
    passwordHasher.hash.mockRejectedValueOnce(new Error("hash failed"));

    const hashFailure = await useCase.run(input);

    recoveryRepository.createPendingRequest.mockResolvedValueOnce({
      type: "infrastructureError",
    });
    const persistenceFailure = await useCase.run(input);

    expect(hashFailure.getData()).toEqual({});
    expect(persistenceFailure.getData()).toEqual({});
    expect(emailService.sendWithResult).not.toHaveBeenCalled();
    expect(recoveryRepository.invalidatePendingRequest).not.toHaveBeenCalled();
    expectSafeLogs();
  });

  it("keeps the generic result and cleans up a pending request after rejected delivery", async () => {
    emailService.sendWithResult.mockResolvedValue({ accepted: false });

    const result = await useCase.run(input);

    expect(result.getData()).toEqual({});
    expect(recoveryRepository.invalidatePendingRequest).toHaveBeenCalledWith(
      "internal-request-id",
      expect.any(Date)
    );
    expect(recoveryRepository.activatePendingRequest).not.toHaveBeenCalled();
    expectSafeLogs();
  });

  it("cleans up and logs safely when activation fails", async () => {
    recoveryRepository.activatePendingRequest.mockResolvedValue({
      type: "requestNotActivatable",
    });
    recoveryRepository.invalidatePendingRequest.mockRejectedValue(
      new Error("cleanup failed")
    );

    const result = await useCase.run(input);

    expect(result.getData()).toEqual({});
    expect(recoveryRepository.invalidatePendingRequest).toHaveBeenCalledWith(
      "internal-request-id",
      expect.any(Date)
    );
    expectSafeLogs();
  });

  it("preserves an internal lookup error because eligibility cannot be determined", async () => {
    authRepository.findByEmail.mockResolvedValue(Result.fail(lookupFailure()));

    const result = await useCase.run(input);

    expect(result.isSuccess).toBe(false);
    expect(result.getError().statusCode).toBe(500);
    expect(passwordHasher.hash).not.toHaveBeenCalled();
  });
});

function missingUserError(): AuthenticationError {
  return AuthenticationError.userNotFound("User not found", "User not found");
}

function lookupFailure(): AuthenticationError {
  return AuthenticationError.internalServerError(
    "User lookup failed",
    "User lookup failed"
  );
}

function expectSafeLogs(): void {
  for (const [message, metadata] of logger.error.mock.calls) {
    expect(`${message} ${JSON.stringify(metadata)}`).not.toContain(input.email);
    expect(`${message} ${JSON.stringify(metadata)}`).not.toContain(input.ip);
    expect(`${message} ${JSON.stringify(metadata)}`).not.toContain(
      "internal-request-id"
    );
    expect(`${message} ${JSON.stringify(metadata)}`).not.toContain("code-hash");
  }
}
