import { ErrorCode } from "@shared/domain/errors/code.ts";

function errorDefinition(
  message: string,
  description: string,
  code: ErrorCode,
  statusCode: number
) {
  return Object.freeze({
    message,
    description,
    code,
    status: "error" as const,
    statusCode,
  });
}

export const authenticationErrorCatalog = Object.freeze({
  emailNotFound: errorDefinition(
    "Invalid credentials",
    "The provided email or password is incorrect",
    ErrorCode.NOT_FOUND,
    404
  ),
  userNotFound: errorDefinition(
    "User not found",
    "The user with the provided ID does not exist",
    ErrorCode.NOT_FOUND,
    404
  ),
  invalidCredentials: errorDefinition(
    "Invalid credentials",
    "The provided email or password is incorrect",
    ErrorCode.BAD_REQUEST,
    400
  ),
  userNotVerifiedOrBlocked: errorDefinition(
    "Invalid credentials",
    "The provided email or password is incorrect",
    ErrorCode.FORBIDDEN,
    403
  ),
  sessionUserNotEligible: errorDefinition(
    "Invalid credentials",
    "The provided credentials cannot be used to start a session",
    ErrorCode.FORBIDDEN,
    403
  ),
  passwordValidationFailed: errorDefinition(
    "Password validation failed",
    "An error occurred while validating the password",
    ErrorCode.INTERNAL_SERVER,
    500
  ),
  accessTokenGenerationFailed: errorDefinition(
    "Token generation failed",
    "An error occurred while generating the authentication token",
    ErrorCode.INTERNAL_SERVER,
    500
  ),
  failedLoginAttemptsUpdateFailed: errorDefinition(
    "Failed login attempts update failed",
    "An error occurred while updating failed login attempts",
    ErrorCode.INTERNAL_SERVER,
    500
  ),
  failedLoginAttemptsResetFailed: errorDefinition(
    "Failed login attempts reset failed",
    "An error occurred while resetting failed login attempts",
    ErrorCode.INTERNAL_SERVER,
    500
  ),
  sessionReplacementFailed: errorDefinition(
    "Session replacement failed",
    "An error occurred while replacing the active session",
    ErrorCode.INTERNAL_SERVER,
    500
  ),
  sessionLifetimeConfigurationInvalid: errorDefinition(
    "Session configuration invalid",
    "The session lifetime configuration is invalid",
    ErrorCode.INTERNAL_SERVER,
    500
  ),
});
