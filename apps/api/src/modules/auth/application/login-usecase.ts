import type { LoginPayload } from "@atlas/schemas/lib/auth/login.ts";
import AuthenticationError from "@modules/auth/domain/error.ts";
import type { AuthRepository } from "@modules/auth/domain/repository.ts";
import { Result } from "@shared/domain/result.ts";
import { tryCatch } from "@shared/utils/try-catch.ts";
import { inject, injectable } from "inversify";
import type { PasswordHasher } from "../domain/password-hasher.ts";
import type { User } from "../domain/user.ts";

@injectable()
export class LoginUserUseCase {
  private readonly repository: AuthRepository;
  private readonly passwordHasher: PasswordHasher;

  constructor(
    @inject("AuthRepository") repository: AuthRepository,
    @inject("PasswordHasher") passwordHasher: PasswordHasher
  ) {
    this.repository = repository;
    this.passwordHasher = passwordHasher;
  }
  run = async (
    dto: LoginPayload
  ): Promise<Result<User, AuthenticationError>> => {
    const result = await this.repository.findByEmail(dto.email);
    if (!result.isSuccess) {
      return Result.fail(result.getError());
    }
    const user = result.getData();
    console.log(dto.password, user.password);
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
    return Result.success(user);
  };
}
