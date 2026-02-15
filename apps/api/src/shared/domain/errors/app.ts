import type { ErrorCode } from "./code.ts";
import { ErrorDetails } from "./detail.ts";

export type AppErrorStatus = "fail" | "error";

export default class AppError extends Error {
  readonly error: ErrorDetails;
  readonly status: AppErrorStatus;
  readonly description: string;
  readonly statusCode: number;

  constructor(
    message: string,
    description: string,
    code: ErrorCode,
    status: AppErrorStatus,
    statusCode: number
  ) {
    super(message);
    this.status = status;
    this.statusCode = statusCode;
    this.description = description;
    this.error = new ErrorDetails(code, message, description);
  }
}
