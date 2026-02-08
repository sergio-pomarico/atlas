import AppError, { type AppErrorStatus } from "./app.ts";
import { ErrorCode } from "./code.ts";

const BAD_REQUEST = 400;
const UNAUTHORIZED = 401;
const FORBIDDEN = 403;
const NOT_FOUND = 404;
const INTERNAL_SERVER = 500;

export default class HttpError extends AppError {
  private constructor(
    message: string,
    description: string,
    code: ErrorCode,
    status: AppErrorStatus,
    statusCode: number
  ) {
    super(message, description, code, status, statusCode);
    Error.captureStackTrace(this, HttpError);
  }

  static badRequest(
    message: string,
    description: string,
    code: ErrorCode = ErrorCode.BAD_REQUEST
  ): HttpError {
    return new HttpError(message, description, code, "error", BAD_REQUEST);
  }

  static unauthorize(
    message: string,
    description: string,
    code: ErrorCode = ErrorCode.UNAUTHORIZED
  ): HttpError {
    return new HttpError(message, description, code, "error", UNAUTHORIZED);
  }

  static forbiden(
    message: string,
    description: string,
    code: ErrorCode = ErrorCode.FORBIDDEN
  ): HttpError {
    return new HttpError(message, description, code, "error", FORBIDDEN);
  }

  static notFound(
    message: string,
    description: string,
    code: ErrorCode = ErrorCode.NOT_FOUND
  ): HttpError {
    return new HttpError(message, description, code, "error", NOT_FOUND);
  }

  static internalServer(
    description: string,
    code: ErrorCode = ErrorCode.INTERNAL_SERVER,
    message = "Internal Server Error"
  ) {
    return new HttpError(message, description, code, "fail", INTERNAL_SERVER);
  }
}
