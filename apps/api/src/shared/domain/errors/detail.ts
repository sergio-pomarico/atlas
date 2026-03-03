import type { ErrorCode } from "./code.ts";

export class ErrorDetails {
  readonly code: ErrorCode;
  readonly description: string;

  constructor(code: ErrorCode, description: string) {
    this.code = code;
    this.description = description;
  }
}
