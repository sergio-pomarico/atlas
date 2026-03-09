import type { UserEntity } from "@atlas/entities/user.ts";
import AuthenticationError from "@modules/auth/domain/error.ts";
import type { AuthRepository } from "@modules/auth/domain/repository.ts";
import { User } from "@modules/auth/domain/user.ts";
import { Result } from "@shared/domain/result.ts";
import type {
  PrismaError,
  PrismaService,
} from "@shared/infrastructure/services/prisma.ts";
import { tryCatch } from "@shared/utils/try-catch.ts";
import { inject, injectable } from "inversify";

@injectable()
export class AuthRepositoryImpl implements AuthRepository {
  private readonly prismaService: PrismaService;
  constructor(@inject("PrismaService") prismaService: PrismaService) {
    this.prismaService = prismaService;
  }
  increaseFailedLoginAttempts = async (
    userId: string
  ): Promise<Result<void, AuthenticationError>> => {
    const result = await tryCatch<UserEntity | null, AuthenticationError>(
      this.prismaService.getClient().user.findUnique({
        where: { id: userId },
      }) as Promise<UserEntity | null>
    );
    if (!result.isSuccess) {
      return Result.fail(result.getError());
    }
    const data = result.getData();
    const user = data ? new User(data) : null;
    if (!user) {
      return Result.fail(
        AuthenticationError.userNotFound(
          "User not found",
          "The user with the provided ID does not exist"
        )
      );
    }
    user.incrementFailedLoginAttempts();
    await tryCatch<UserEntity, PrismaError>(
      this.prismaService.getClient().user.update({
        where: { id: userId },
        data: user.toObject(),
      }) as Promise<UserEntity>
    );
    return Result.success(undefined);
  };
  findByEmail = async (
    email: string
  ): Promise<Result<User, AuthenticationError>> => {
    const result = await tryCatch<UserEntity | null, PrismaError>(
      this.prismaService.getClient().user.findUniqueOrThrow({
        where: { email },
      }) as Promise<UserEntity | null>
    );
    if (!result.isSuccess) {
      return Result.fail(
        AuthenticationError.userNotFound(
          "Invalid credentials",
          "The provided email or password is incorrect"
        )
      );
    }
    const data = result.getData();

    const user = data ? new User(data) : null;
    if (!user) {
      return Result.fail(
        AuthenticationError.userNotFound(
          "Invalid credentials",
          "The provided email or password is incorrect"
        )
      );
    }
    return Result.success(user);
  };
}
