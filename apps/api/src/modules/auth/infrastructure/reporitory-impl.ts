import type { UserEntity } from "@atlas/entities/user.ts";
import AuthenticationError from "@modules/auth/domain/error/index.ts";
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
      })
    );
    if (!result.isSuccess) {
      return Result.fail(result.getError());
    }
    const data = result.getData();
    const user = data ? new User(data) : null;
    if (!user) {
      return Result.fail(AuthenticationError.userNotFound());
    }
    user.incrementFailedLoginAttempts();
    const updateResult = await tryCatch<UserEntity, PrismaError>(
      this.prismaService.getClient().user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: user.toObject().failedLoginAttempts,
          status: user.toObject().status,
        },
      })
    );
    if (!updateResult.isSuccess) {
      return Result.fail(AuthenticationError.failedLoginAttemptsUpdateFailed());
    }
    return Result.success(undefined);
  };
  findByEmail = async (
    email: string
  ): Promise<Result<User, AuthenticationError>> => {
    const result = await tryCatch<UserEntity | null, PrismaError>(
      this.prismaService.getClient().user.findUniqueOrThrow({
        where: { email },
      })
    );
    if (!result.isSuccess) {
      return Result.fail(AuthenticationError.emailNotFound());
    }
    const data = result.getData();

    const user = data ? new User(data) : null;
    if (!user) {
      return Result.fail(AuthenticationError.emailNotFound());
    }
    return Result.success(user);
  };
  resetFailedLoginAttempts = async (
    userId: string
  ): Promise<Result<void, AuthenticationError>> => {
    const result = await tryCatch<UserEntity | null, AuthenticationError>(
      this.prismaService.getClient().user.findUnique({
        where: { id: userId },
      })
    );
    if (!result.isSuccess) {
      return Result.fail(result.getError());
    }
    const data = result.getData();
    const user = data ? new User(data) : null;
    if (!user) {
      return Result.fail(AuthenticationError.userNotFound());
    }
    user.resetFailedLoginAttempts();
    const updateResult = await tryCatch<UserEntity, PrismaError>(
      this.prismaService.getClient().user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: user.toObject().failedLoginAttempts,
        },
      })
    );
    if (!updateResult.isSuccess) {
      return Result.fail(AuthenticationError.failedLoginAttemptsResetFailed());
    }
    return Result.success(undefined);
  };
}
