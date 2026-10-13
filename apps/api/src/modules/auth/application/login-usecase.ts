import { randomUUID } from "node:crypto";
import type { LoginPayload } from "@atlas/schemas/lib/auth/login.ts";
import AuthenticationError from "@modules/auth/domain/error/index.ts";
import type { AuthRepository } from "@modules/auth/domain/repository.ts";
import type { SessionRepository } from "@modules/auth/domain/session-repository.ts";
import { Result } from "@shared/domain/result.ts";
import type {
  JWTError,
  JWTService,
} from "@shared/infrastructure/services/jwt.ts";
import { tryCatch } from "@shared/utils/try-catch.ts";
import { inject, injectable } from "inversify";
import type { PasswordHasher } from "../domain/password-hasher.ts";

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

export interface LoginInput extends LoginPayload {
  ipAddress: string;
  userAgent: string | null;
}

@injectable()
export class LoginUserUseCase {
  private readonly repository: AuthRepository;
  private readonly passwordHasher: PasswordHasher;
  private readonly jwtService: JWTService;
  private readonly sessionRepository: SessionRepository;
  private readonly sessionTtlDays: number;

  constructor(
    @inject("AuthRepository") repository: AuthRepository,
    @inject("PasswordHasher") passwordHasher: PasswordHasher,
    @inject("JWTService") jwtService: JWTService,
    @inject("SessionRepository") sessionRepository: SessionRepository,
    @inject("SessionTtlDays") sessionTtlDays: number
  ) {
    this.repository = repository;
    this.passwordHasher = passwordHasher;
    this.jwtService = jwtService;
    this.sessionRepository = sessionRepository;
    this.sessionTtlDays = sessionTtlDays;
  }
  run = async (
    dto: LoginInput
  ): Promise<Result<LoginResult, AuthenticationError>> => {
    const result = await this.repository.findByEmail(dto.email);
    if (!result.isSuccess) {
      return Result.fail(result.getError());
    }
    const user = result.getData();
    if (!(user.isActive() && user.isVerified())) {
      return Result.fail(AuthenticationError.userNotVerifiedOrBlocked());
    }
    const isPasswordValid = await tryCatch<boolean, Error>(
      this.passwordHasher.compare(dto.password, user.password)
    );
    if (!isPasswordValid.isSuccess) {
      return Result.fail(AuthenticationError.passwordValidationFailed());
    }
    if (!isPasswordValid.getData()) {
      await this.repository.increaseFailedLoginAttempts(user.id);
      return Result.fail(AuthenticationError.invalidCredentials());
    }
    const resetResult = await this.repository.resetFailedLoginAttempts(user.id);
    if (!resetResult.isSuccess) {
      return Result.fail(resetResult.getError());
    }
    const sessionId = randomUUID();
    const expiration = await this.sessionRepository.resolveSessionExpiration(
      this.sessionTtlDays
    );
    if (!expiration.isSuccess) {
      return Result.fail(expiration.getError());
    }
    const expiresAt = expiration.getData();
    const accessTokenResult = await tryCatch<string | null, JWTError>(
      this.jwtService.sign(
        {
          sub: user.id,
          scope: "access",
          sid: sessionId,
        },
        "access",
        { expiresIn: "5m" }
      )
    );
    if (!accessTokenResult.isSuccess) {
      return Result.fail(AuthenticationError.accessTokenGenerationFailed());
    }
    const accessToken = accessTokenResult.getData();
    if (!accessToken) {
      return Result.fail(AuthenticationError.accessTokenGenerationFailed());
    }
    const refreshTokenResult = await tryCatch<string | null, JWTError>(
      this.jwtService.sign(
        {
          sub: user.id,
          scope: "refresh",
          sid: sessionId,
          exp: expiresAt.getTime() / 1000,
        },
        "refresh"
      )
    );
    if (!refreshTokenResult.isSuccess) {
      return Result.fail(AuthenticationError.refreshTokenGenerationFailed());
    }
    const refreshToken = refreshTokenResult.getData();
    if (!refreshToken) {
      return Result.fail(AuthenticationError.refreshTokenGenerationFailed());
    }
    const sessionResult = await this.sessionRepository.replaceActiveSession({
      id: sessionId,
      userId: user.id,
      ipAddress: dto.ipAddress,
      userAgent: dto.userAgent,
      expiresAt,
    });
    if (!sessionResult.isSuccess) {
      return Result.fail(sessionResult.getError());
    }
    return Result.success({
      accessToken,
      refreshToken,
      refreshTokenExpiresAt: expiresAt,
    });
  };
}
