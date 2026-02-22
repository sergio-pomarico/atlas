import type { UserEntity } from "@atlas/entities/user.ts";
import { Result } from "@shared/domain/result.ts";
import prisma from "@shared/infrastructure/data/db.ts";
import { tryCatch } from "@shared/utils/try-catch.ts";
import { injectable } from "inversify";
import AuthenticationError from "../domain/error.ts";
import type { AuthRepository } from "../domain/repository.ts";

@injectable()
export class AuthRepositoryImpl implements AuthRepository {
  findByEmail = async (
    email: string,
  ): Promise<Result<UserEntity, AuthenticationError>> => {
    const result = await tryCatch<UserEntity | null, AuthenticationError>(
      prisma.user.findUnique({
        where: { email },
      }) as Promise<UserEntity | null>,
    );
    if (!result.error) {
      return Result.err(result.error);
    }
    const user = result.data;
    if (!user) {
      return Result.err(
        AuthenticationError.userNotFound(
          "Invalid credentials",
          "The provided email or password is incorrect",
        ),
      );
    }
    return Result.success(user);
  };
}
