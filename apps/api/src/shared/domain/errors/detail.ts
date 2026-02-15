import type { ErrorCode } from "./code.ts";

export class ErrorDetails {
  readonly code: ErrorCode;
  readonly message: string;
  readonly description: string;

  constructor(code: ErrorCode, message: string, description: string) {
    this.code = code;
    this.message = message;
    this.description = description;
  }
}
