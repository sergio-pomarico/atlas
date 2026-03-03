import type { ErrorResponseStatus } from "../response.ts";
import type { ErrorCode } from "./code.ts";
import { ErrorDetails } from "./detail.ts";

export default class AppError extends Error {
  readonly error: ErrorDetails;
  readonly status: ErrorResponseStatus;
  readonly statusCode: number;

  constructor(
    message: string,
    description: string,
    code: ErrorCode,
    status: ErrorResponseStatus,
    statusCode: number
  ) {
    super(message);
    this.status = status;
    this.statusCode = statusCode;
    this.error = new ErrorDetails(code, description);
  }
}
