import AppError from "@shared/domain/errors/app.ts";
import { ErrorCode } from "@shared/domain/errors/code.ts";
import type { ApiErrorResponse } from "@shared/domain/response.ts";
import { Logger } from "@shared/infrastructure/services/logger.ts";
import { omit } from "@shared/utils/properties.ts";
import type { NextFunction, Request, Response } from "express";

const logger = Logger.getInstance();
const INTERNAL_SERVER_STATUS_CODE = 500;
const INTERNAL_SERVER_MESSAGE = "internal server error";
const UNEXPECTED_ERROR_DESCRIPTION = "An unexpected error has occurred";

const internalServerResponse = (
  code: ErrorCode = ErrorCode.INTERNAL_SERVER,
  status: ApiErrorResponse["status"] = "error"
): ApiErrorResponse => ({
  status,
  message: INTERNAL_SERVER_MESSAGE,
  error: {
    code,
    description: UNEXPECTED_ERROR_DESCRIPTION,
  },
});

const errorMiddleware = (
  err: Error,
  _: Request,
  res: Response<ApiErrorResponse>,
  next: NextFunction
) => {
  if (res.headersSent) {
    return next(err);
  }
  let statusCode = INTERNAL_SERVER_STATUS_CODE;
  let response = internalServerResponse();

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    if (
      err.status === "fail" ||
      err.statusCode >= INTERNAL_SERVER_STATUS_CODE
    ) {
      logger.fatal(err.message, {
        status: err.status,
        statusCode: err.statusCode,
        stack: err.stack,
      });
      response = internalServerResponse(err.error.code, err.status);
    } else {
      response = {
        ...omit(err, ["stack", "statusCode"]),
        message: err.message,
      };
    }
  }
  res.status(statusCode).json(response);
};

export default errorMiddleware;
