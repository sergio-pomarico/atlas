import type { User } from "@modules/auth/domain/user.ts";
import type { Result } from "@shared/domain/result.ts";
import type AuthenticationError from "./error.ts";

export interface AuthRepository {
  findByEmail: (email: string) => Promise<Result<User, AuthenticationError>>;
  increaseFailedLoginAttempts: (
    userId: string
  ) => Promise<Result<void, AuthenticationError>>;
}
