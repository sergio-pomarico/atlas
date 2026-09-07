import type { LoginPayload } from "@atlas/schemas/lib/auth/login.ts";
import AuthenticationError from "@modules/auth/domain/error.ts";
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
      return Result.fail(
        AuthenticationError.userNotVerifiedOrBlocked(
          "Invalid credentials",
          "The provided email or password is incorrect"
        )
      );
    }
    const isPasswordValid = await tryCatch<boolean, Error>(
      this.passwordHasher.compare(dto.password, user.password)
    );
    if (!isPasswordValid.isSuccess) {
      return Result.fail(
        AuthenticationError.internalServerError(
          "Password validation failed",
          "An error occurred while validating the password"
        )
      );
    }
    if (!isPasswordValid.getData()) {
      await this.repository.increaseFailedLoginAttempts(user.id);
      return Result.fail(
        AuthenticationError.invalidCredentials(
          "Invalid credentials",
          "The provided email or password is incorrect"
        )
      );
    }
    const resetResult = await this.repository.resetFailedLoginAttempts(user.id);
    if (!resetResult.isSuccess) {
      return Result.fail(resetResult.getError());
    }
    const token = await tryCatch<string | null, JWTError>(
      this.jwtService.sign(
        {
          sub: user.id,
          email: user.email,
          scope: "access",
        },
        "access",
        { expiresIn: "5m" }
      )
    );
    if (!token.isSuccess) {
      return Result.fail(
        AuthenticationError.internalServerError(
          "Token generation failed",
          "An error occurred while generating the authentication token"
        )
      );
    }
    const accessToken = token.getData();
    if (!accessToken) {
      return Result.fail(
        AuthenticationError.internalServerError(
          "Token generation failed",
          "An error occurred while generating the authentication token"
        )
      );
    }
    const sessionResult = await this.sessionRepository.replaceActiveSession({
      userId: user.id,
      ipAddress: dto.ipAddress,
      userAgent: dto.userAgent,
      sessionTtlDays: this.sessionTtlDays,
    });
    if (!sessionResult.isSuccess) {
      return Result.fail(sessionResult.getError());
    }
    return Result.success({ accessToken });
  };
}
