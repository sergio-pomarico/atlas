import type { Result } from "@api/domain/result.ts";
import type { UserEntity } from "@atlas/entities/user.ts";
import type { LoginPayload } from "@atlas/schemas/lib/auth/login.ts";
import type AuthenticationError from "./error.ts";

export interface AuthRepository {
  login: (
    dto: LoginPayload
  ) => Promise<Result<UserEntity, AuthenticationError>>;
}
