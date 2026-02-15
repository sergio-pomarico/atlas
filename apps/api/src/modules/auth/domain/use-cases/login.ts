import type { UserEntity } from "@atlas/entities/user.ts";
import type { LoginPayload } from "@atlas/schemas/lib/auth/login.ts";
import type { AuthRepository } from "@modules/auth/domain/repository.ts";
import { Result } from "@shared/domain/result.ts";
import { inject, injectable } from "inversify";
import type AuthenticationError from "../error.ts";

@injectable()
export class LoginUserUseCase {
  private readonly repository: AuthRepository;

  constructor(@inject("AuthRepository") repository: AuthRepository) {
    this.repository = repository;
  }
  run = async (
    dto: LoginPayload
  ): Promise<Result<UserEntity, AuthenticationError>> => {
    const result = await this.repository.login(dto);
    if (result.error) {
      return Result.err(result.error);
    }
    const { data: user } = result;
    return Result.success(user);
  };
}
