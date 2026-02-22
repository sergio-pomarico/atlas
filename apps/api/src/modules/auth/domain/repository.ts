import type { UserEntity } from "@atlas/entities/user.ts";
import type { Result } from "@shared/domain/result.ts";
import type AuthenticationError from "./error.ts";

export interface AuthRepository {
  findByEmail: (
    email: string
  ) => Promise<Result<UserEntity, AuthenticationError>>;
}
