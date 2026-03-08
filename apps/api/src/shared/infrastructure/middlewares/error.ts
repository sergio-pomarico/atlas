import AppError from "@shared/domain/errors/app.ts";
import type { ApiErrorResponse } from "@shared/domain/response.ts";
import { Logger } from "@shared/infrastructure/services/logger.ts";
import { omit } from "@shared/utils/properties.ts";
import type { NextFunction, Request, Response } from "express";

const logger = Logger.getInstance();

const errorMiddleware = (
  err: Error,
  _: Request,
  res: Response<ApiErrorResponse>,
  __: NextFunction
) => {
  if (err instanceof AppError) {
    if (err.status === "fail" || err.statusCode >= 500) {
      logger.fatal(err.message, {
        status: err.status,
        statusCode: err.statusCode,
        stack: err.stack,
      });
      res.status(err.statusCode).json({
        ...omit(err, ["stack", "statusCode"]),
        message: "internal server error",
        error: {
          code: err.error.code,
          description: "An unexpected error has occurred",
        },
      });
    }
    res
      .status(err.statusCode)
      .json({ ...omit(err, ["stack", "statusCode"]), message: err.message });
  }
};

export default errorMiddleware;
