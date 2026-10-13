import { TOKEN_SCOPE } from "@atlas/schemas/lib/auth/token.ts";
import AuthenticationError from "@modules/auth/domain/error/index.ts";
import type { SessionRepository } from "@modules/auth/domain/session-repository.ts";
import { Result } from "@shared/domain/result.ts";
import {
  type JWTService,
  parseRefreshToken,
} from "@shared/infrastructure/services/jwt.ts";
import { tryCatch } from "@shared/utils/try-catch.ts";
import { inject, injectable } from "inversify";

export interface RefreshAccessTokenResult {
  accessToken: string;
}

@injectable()
export class RefreshAccessTokenUseCase {
  private readonly jwtService: JWTService;
  private readonly sessionRepository: SessionRepository;

  constructor(
    @inject("JWTService") jwtService: JWTService,
    @inject("SessionRepository") sessionRepository: SessionRepository
  ) {
    this.jwtService = jwtService;
    this.sessionRepository = sessionRepository;
  }

  run = async (
    refreshToken: string
  ): Promise<Result<RefreshAccessTokenResult, AuthenticationError>> => {
    const verification = await tryCatch<unknown | null, Error>(
      this.jwtService.verify(refreshToken, TOKEN_SCOPE.REFRESH)
    );
    if (!verification.isSuccess) {
      return Result.fail(AuthenticationError.refreshTokenValidationFailed());
    }

    const payload = parseRefreshToken(verification.getData());
    if (!payload) {
      return Result.fail(AuthenticationError.unauthorized());
    }

    const session = await this.sessionRepository.validateActiveSession({
      sessionId: payload.sid,
      userId: payload.sub,
    });
    if (!session.isSuccess) {
      return Result.fail(session.getError());
    }
    if (!session.getData()) {
      return Result.fail(AuthenticationError.unauthorized());
    }

    const accessTokenResult = await tryCatch<string | null, Error>(
      this.jwtService.sign(
        {
          sub: payload.sub,
          scope: TOKEN_SCOPE.ACCESS,
          sid: payload.sid,
        },
        TOKEN_SCOPE.ACCESS,
        { expiresIn: "5m" }
      )
    );
    if (!accessTokenResult.isSuccess) {
      return Result.fail(AuthenticationError.accessTokenGenerationFailed());
    }
    const accessToken = accessTokenResult.getData();
    return accessToken
      ? Result.success({ accessToken })
      : Result.fail(AuthenticationError.accessTokenGenerationFailed());
  };
}
