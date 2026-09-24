import { describe, expect, it } from "@jest/globals";
import { authenticationErrorCatalog } from "@modules/auth/domain/error/authentication-error-catalog.ts";
import AuthenticationError from "@modules/auth/domain/error/index.ts";
import { ErrorCode } from "@shared/domain/errors/code.ts";

describe("AuthenticationError factories", () => {
  it.each([
    [
      "emailNotFound",
      AuthenticationError.emailNotFound(),
      "Invalid credentials",
      "The provided email or password is incorrect",
      ErrorCode.NOT_FOUND,
      404,
    ],
    [
      "userNotFound",
      AuthenticationError.userNotFound(),
      "User not found",
      "The user with the provided ID does not exist",
      ErrorCode.NOT_FOUND,
      404,
    ],
    [
      "invalidCredentials",
      AuthenticationError.invalidCredentials(),
      "Invalid credentials",
      "The provided email or password is incorrect",
      ErrorCode.BAD_REQUEST,
      400,
    ],
    [
      "userNotVerifiedOrBlocked",
      AuthenticationError.userNotVerifiedOrBlocked(),
      "Invalid credentials",
      "The provided email or password is incorrect",
      ErrorCode.FORBIDDEN,
      403,
    ],
    [
      "sessionUserNotEligible",
      AuthenticationError.sessionUserNotEligible(),
      "Invalid credentials",
      "The provided credentials cannot be used to start a session",
      ErrorCode.FORBIDDEN,
      403,
    ],
    [
      "passwordValidationFailed",
      AuthenticationError.passwordValidationFailed(),
      "Password validation failed",
      "An error occurred while validating the password",
      ErrorCode.INTERNAL_SERVER,
      500,
    ],
    [
      "accessTokenGenerationFailed",
      AuthenticationError.accessTokenGenerationFailed(),
      "Token generation failed",
      "An error occurred while generating the authentication token",
      ErrorCode.INTERNAL_SERVER,
      500,
    ],
    [
      "failedLoginAttemptsUpdateFailed",
      AuthenticationError.failedLoginAttemptsUpdateFailed(),
      "Failed login attempts update failed",
      "An error occurred while updating failed login attempts",
      ErrorCode.INTERNAL_SERVER,
      500,
    ],
    [
      "failedLoginAttemptsResetFailed",
      AuthenticationError.failedLoginAttemptsResetFailed(),
      "Failed login attempts reset failed",
      "An error occurred while resetting failed login attempts",
      ErrorCode.INTERNAL_SERVER,
      500,
    ],
    [
      "sessionReplacementFailed",
      AuthenticationError.sessionReplacementFailed(),
      "Session replacement failed",
      "An error occurred while replacing the active session",
      ErrorCode.INTERNAL_SERVER,
      500,
    ],
    [
      "sessionLifetimeConfigurationInvalid",
      AuthenticationError.sessionLifetimeConfigurationInvalid(),
      "Session configuration invalid",
      "The session lifetime configuration is invalid",
      ErrorCode.INTERNAL_SERVER,
      500,
    ],
  ])(
    "creates the %s error contract",
    (_name, error, message, description, code, statusCode) => {
      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error).toMatchObject({
        message,
        error: { code, description },
        status: "error",
        statusCode,
      });
    }
  );

  it("keeps the catalog and each definition immutable", () => {
    expect(Object.isFrozen(authenticationErrorCatalog)).toBe(true);
    for (const definition of Object.values(authenticationErrorCatalog)) {
      expect(Object.isFrozen(definition)).toBe(true);
    }
  });
});
