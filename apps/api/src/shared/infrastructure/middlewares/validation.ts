import { type Schema, zodError } from "@atlas/schemas/lib/zod.ts";
import AppError from "@shared/domain/errors/app.ts";
import { ErrorCode } from "@shared/domain/errors/code.ts";
import type { NextFunction, Request, Response } from "express";

export const schemaValidation =
  (schema: Schema) => (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (result.error) {
      const validationError = zodError(result.error);
      const httpError = new AppError(
        "the data provided is invalid",
        validationError.message,
        ErrorCode.BAD_REQUEST,
        "error",
        400
      );
      next(httpError);
    } else {
      next();
    }
  };
