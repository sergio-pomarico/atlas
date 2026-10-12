import type { AccessToken } from "@atlas/schemas/lib/auth/token.ts";
import AuthenticationError from "@modules/auth/domain/error/index.ts";
import type { SessionRepository } from "@modules/auth/domain/session-repository.ts";
import {
  type JWTService,
  parseAccessToken,
} from "@shared/infrastructure/services/jwt.ts";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { inject, injectable } from "inversify";

type SessionValidator = Pick<SessionRepository, "validateActiveSession">;

@injectable()
export class AuthMiddleware {
  private readonly jwtService: JWTService;
  private readonly sessionValidator: SessionValidator;

  constructor(
    @inject("JWTService") jwtService: JWTService,
    @inject("SessionRepository")
    sessionValidator: SessionValidator
  ) {
    this.jwtService = jwtService;
    this.sessionValidator = sessionValidator;
  }

  require = (scope: AccessToken["scope"]): RequestHandler => {
    return async (req: Request, _res: Response, next: NextFunction) => {
      const token = req.headers.authorization;
      if (!token) {
        next(AuthenticationError.unauthorized());
        return;
      }

      try {
        const payload = parseAccessToken(
          await this.jwtService.verify(token, scope)
        );
        if (!payload) {
          next(AuthenticationError.unauthorized());
          return;
        }

        const session = await this.sessionValidator.validateActiveSession({
          sessionId: payload.sid,
          userId: payload.sub,
        });
        if (!session.isSuccess) {
          next(session.getError());
          return;
        }
        if (!session.getData()) {
          next(AuthenticationError.unauthorized());
          return;
        }

        req.auth = {
          userId: payload.sub,
          sessionId: payload.sid,
          scope: payload.scope,
        };
        next();
      } catch (error) {
        next(error);
      }
    };
  };
}
