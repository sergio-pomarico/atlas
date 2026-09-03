import AppError from "@shared/domain/errors/app.ts";
import { ErrorCode } from "@shared/domain/errors/code.ts";

export class PasswordRecoveryRateLimitError extends AppError {
  readonly retryAfterMilliseconds: number;

  constructor(retryAfterMilliseconds: number) {
    super(
      "Please wait before requesting another code",
      "A password reset code was recently requested",
      ErrorCode.TOO_MANY_REQUESTS,
      "error",
      429
    );
    this.retryAfterMilliseconds = retryAfterMilliseconds;
    Error.captureStackTrace(this, PasswordRecoveryRateLimitError);
  }
}

export default class AuthenticationError extends AppError {
  constructor(
    message: string,
    description: string,
    code: ErrorCode,
    status: "fail" | "error",
    statusCode: number
  ) {
    super(message, description, code, status, statusCode);
    Error.captureStackTrace(this, AuthenticationError);
  }

  static internalServerError(
    message: string,
    description: string,
    code: ErrorCode = ErrorCode.INTERNAL_SERVER
  ): AuthenticationError {
    return new AuthenticationError(message, description, code, "error", 500);
  }

  static userNotFound(
    message: string,
    description: string,
    code: ErrorCode = ErrorCode.NOT_FOUND
  ): AuthenticationError {
    return new AuthenticationError(message, description, code, "error", 404);
  }

  static userNotVerifiedOrBlocked(
    message: string,
    description: string,
    code: ErrorCode = ErrorCode.FORBIDDEN
  ): AuthenticationError {
    return new AuthenticationError(message, description, code, "error", 403);
  }

  static invalidCredentials(
    message: string,
    description: string,
    code: ErrorCode = ErrorCode.BAD_REQUEST
  ): AuthenticationError {
    return new AuthenticationError(message, description, code, "error", 400);
  }

  static passwordRecoveryRateLimited(
    retryAfterMilliseconds: number
  ): PasswordRecoveryRateLimitError {
    return new PasswordRecoveryRateLimitError(retryAfterMilliseconds);
  }

  static passwordRecoveryUnavailable(): AuthenticationError {
    return new AuthenticationError(
      "Password recovery is temporarily unavailable",
      "The password recovery service is temporarily unavailable",
      ErrorCode.SERVICE_UNAVAILABLE,
      "error",
      503
    );
  }
}
