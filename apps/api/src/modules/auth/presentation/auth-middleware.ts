import type { AccessToken } from "@atlas/schemas/lib/auth/token.ts";
import AuthenticationError from "@modules/auth/domain/error/index.ts";
import type { SessionRepository } from "@modules/auth/domain/session-repository.ts";
import { Result } from "@shared/domain/result.ts";
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
        const authentication = await this.authenticate(token, scope);
        if (!authentication.isSuccess) {
          next(authentication.getError());
          return;
        }
        const payload = authentication.getData();

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

  private readonly authenticate = async (
    token: string,
    scope: AccessToken["scope"]
  ): Promise<Result<AccessToken, AuthenticationError>> => {
    const payload = parseAccessToken(
      await this.jwtService.verify(token, scope)
    );
    if (!payload) {
      return Result.fail(AuthenticationError.unauthorized());
    }

    const session = await this.sessionValidator.validateActiveSession({
      sessionId: payload.sid,
      userId: payload.sub,
    });
    if (!session.isSuccess) {
      return Result.fail(session.getError());
    }
    return session.getData()
      ? Result.success(payload)
      : Result.fail(AuthenticationError.unauthorized());
  };
}
