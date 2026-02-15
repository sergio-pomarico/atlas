import AppError from "@shared/domain/errors/app.ts";
import { Logger } from "@shared/infrastructure/services/logger.ts";
import type { NextFunction, Request, Response } from "express";

const logger = Logger.getInstance();

const errorMiddleware = (
  err: Error,
  _: Request,
  res: Response,
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
        ...err,
        error: { ...err.error, message: "An unexpected error has occurred" },
      });
    }
    res.status(err.statusCode).json(err);
  }
};

export default errorMiddleware;
