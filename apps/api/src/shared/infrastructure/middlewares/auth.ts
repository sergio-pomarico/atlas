import AppError from "@shared/domain/errors/app.ts";
import { ErrorCode } from "@shared/domain/errors/code.ts";
import {
  JWTService,
  type Scope,
  type Token,
} from "@shared/infrastructure/services/jwt.ts";
import type { NextFunction, Request, Response } from "express";

export const authMiddleware =
  (scope: Scope | Scope[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const { authorization: token } = req.headers;

    const error = new AppError(
      "User not authenticated",
      "You must be logged in to access this resource",
      ErrorCode.UNAUTHORIZED,
      "error",
      401
    );

    if (token) {
      const payload = await JWTService.getInstance().verify<Token>(
        token,
        "access"
      );
      if (payload) {
        if (
          (Array.isArray(scope) && !scope.includes(payload.scope)) ||
          (!Array.isArray(scope) && scope !== payload.scope)
        ) {
          res.status(401).send(error);
        }
        if (req.body) {
          req.body.userId = payload.sub;
        } else {
          req.body = {};
          req.body.userId = payload.sub;
        }
        next();
      } else {
        res.status(401).send(error);
      }
    } else {
      res.status(401).send(error);
    }
  };
