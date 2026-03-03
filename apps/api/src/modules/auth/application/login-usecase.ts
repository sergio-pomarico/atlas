import type { LoginPayload } from "@atlas/schemas/lib/auth/login.ts";
import AuthenticationError from "@modules/auth/domain/error.ts";
import type { AuthRepository } from "@modules/auth/domain/repository.ts";
import type { User } from "@modules/auth/domain/user.ts";
import { Result } from "@shared/domain/result.ts";
import type {
  JWTError,
  JWTService,
} from "@shared/infrastructure/services/jwt.ts";
import { tryCatch } from "@shared/utils/try-catch.ts";
import { inject, injectable } from "inversify";
import type { PasswordHasher } from "../domain/password-hasher.ts";

@injectable()
export class LoginUserUseCase {
  private readonly repository: AuthRepository;
  private readonly passwordHasher: PasswordHasher;
  private readonly jwtService: JWTService;

  constructor(
    @inject("AuthRepository") repository: AuthRepository,
    @inject("PasswordHasher") passwordHasher: PasswordHasher,
    @inject("JWTService") jwtService: JWTService
  ) {
    this.repository = repository;
    this.passwordHasher = passwordHasher;
    this.jwtService = jwtService;
  }
  run = async (
    dto: LoginPayload
  ): Promise<Result<User, AuthenticationError>> => {
    const result = await this.repository.findByEmail(dto.email);
    if (!result.isSuccess) {
      return Result.fail(result.getError());
    }
    const user = result.getData();
    const isPasswordValid = await tryCatch<boolean, Error>(
      this.passwordHasher.compare(dto.password, user.password)
    );
    if (user.isBlocked() || !user.isVerified()) {
      return Result.fail(
        AuthenticationError.userNotVerifiedOrBlocked(
          "Invalid credentials",
          "The provided email or password is incorrect"
        )
      );
    }
    if (!isPasswordValid) {
      await this.repository.increaseFailedLoginAttempts(user.id);
      return Result.fail(
        AuthenticationError.invalidCredentials(
          "Invalid credentials",
          "The provided email or password is incorrect"
        )
      );
    }
    const token = await tryCatch<string | null, JWTError>(
      this.jwtService.sign(
        {
          sub: user.id,
          email: user.email,
          scope: "access",
        },
        "access",
        { expiresIn: "5m", issuer: "atlas-api", audience: "atlas-client" }
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
    console.log(token.getData());
    return Result.success(user);
  };
}
