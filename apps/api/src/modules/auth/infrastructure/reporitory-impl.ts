import type { Result } from "@api/domain/result.ts";
import type { UserEntity } from "@atlas/entities/user.ts";
import type { LoginPayload } from "@atlas/schemas/lib/auth/login.ts";
import { injectable } from "inversify";
import type AuthenticationError from "../domain/error.ts";
import type { AuthRepository } from "../domain/repository.ts";

@injectable()
export class AuthRepositoryImpl implements AuthRepository {
  login: (
    dto: LoginPayload
  ) => Promise<Result<UserEntity, AuthenticationError>>;
}
