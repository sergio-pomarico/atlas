import type { ErrorDetails } from "./errors/detail.ts";

type AppResponseStatus = "success" | "fail" | "error";

export type SuccessResponseStatus = Extract<AppResponseStatus, "success">;
export type ErrorResponseStatus = Exclude<AppResponseStatus, "success">;

export interface ApiSuccessResponse<T = unknown> {
  status: SuccessResponseStatus;
  message: string;
  data?: T;
}

export interface ApiErrorResponse {
  status: ErrorResponseStatus;
  message: string;
  error: ErrorDetails;
}
