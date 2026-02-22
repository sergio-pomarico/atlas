import type { UserEntity } from "@atlas/entities/user.ts";
import type { LoginPayload } from "@atlas/schemas/lib/auth/login.ts";
import AuthenticationError from "@modules/auth/domain/error.ts";
import type { AuthRepository } from "@modules/auth/domain/repository.ts";
import { Result } from "@shared/domain/result.ts";
import { inject, injectable } from "inversify";
import type { PasswordHasher } from "../domain/password-hasher.ts";

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
  ): Promise<Result<UserEntity, AuthenticationError>> => {
    const result = await this.repository.findByEmail(dto.email);
    if (result.error) {
      return Result.err(result.error);
    }
    const { data: user } = result;
    const isPasswordValid = await this.passwordHasher.compare(
      dto.password,
      user.password
    );
    if (!isPasswordValid) {
      return Result.err(
        AuthenticationError.invalidCredentials(
          "Invalid credentials",
          "The provided email or password is incorrect"
        )
      );
    }
    return Result.success(user);
  };
}
