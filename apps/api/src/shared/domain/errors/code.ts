export const ErrorCode = {
  BAD_REQUEST: "BAD_REQUEST", // 400
  UNAUTHORIZED: "UNAUTHORIZED", // 401
  FORBIDDEN: "FORBIDDEN", // 403
  NOT_FOUND: "NOT_FOUND", // 404
  INTERNAL_SERVER: "INTERNAL_SERVER", // 500
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
