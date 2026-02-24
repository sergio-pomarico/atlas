import AppError from "@shared/domain/errors/app.ts";
import { ErrorCode } from "@shared/domain/errors/code.ts";

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
}
