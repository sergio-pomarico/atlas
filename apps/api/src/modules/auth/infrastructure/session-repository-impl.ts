import { UserStatus, type UserStatusType } from "@atlas/entities/user.ts";
import AuthenticationError from "@modules/auth/domain/error.ts";
import type {
  CreateSessionInput,
  SessionRepository,
} from "@modules/auth/domain/session-repository.ts";
import { Result } from "@shared/domain/result.ts";
import type { PrismaService } from "@shared/infrastructure/services/prisma.ts";
import { tryCatch } from "@shared/utils/try-catch.ts";
import { inject, injectable } from "inversify";

class SessionUserNotFoundError extends Error {}
class SessionUserNotEligibleError extends Error {}

interface LockedUserRow {
  id: string;
  status: UserStatusType;
  verified: boolean;
}

interface EffectiveTimeRow {
  effectiveNow: Date;
}

const millisecondsPerDay = 24 * 60 * 60 * 1000;

@injectable()
export class SessionRepositoryImpl implements SessionRepository {
  private readonly prismaService: PrismaService;

  constructor(@inject("PrismaService") prismaService: PrismaService) {
    this.prismaService = prismaService;
  }

  replaceActiveSession = async (
    input: CreateSessionInput
  ): Promise<Result<void, AuthenticationError>> => {
    if (
      !Number.isInteger(input.sessionTtlDays) ||
      input.sessionTtlDays < 1 ||
      input.sessionTtlDays > 90
    ) {
      return Result.fail(
        AuthenticationError.internalServerError(
          "Session configuration invalid",
          "The session lifetime configuration is invalid"
        )
      );
    }

    const result = await tryCatch<void, Error>(
      this.prismaService.getClient().$transaction(async (transaction) => {
        const users = await transaction.$queryRaw<LockedUserRow[]>`
          SELECT
            "id",
            "status",
            "is_verified" AS "verified"
          FROM "User"
          WHERE "id" = ${input.userId}
          FOR UPDATE
        `;

        if (users.length === 0) {
          throw new SessionUserNotFoundError();
        }

        const [user] = users;
        if (!(user?.status === UserStatus.ACTIVE && user.verified)) {
          throw new SessionUserNotEligibleError();
        }

        const [time] = await transaction.$queryRaw<EffectiveTimeRow[]>`
          SELECT clock_timestamp() AS "effectiveNow"
        `;
        if (!time) {
          throw new Error("Database clock did not return a timestamp");
        }
        const expiresAt = new Date(
          time.effectiveNow.getTime() +
            input.sessionTtlDays * millisecondsPerDay
        );

        await transaction.session.updateMany({
          where: { userId: input.userId, revokedAt: null },
          data: { revokedAt: time.effectiveNow },
        });
        await transaction.session.create({
          data: {
            userId: input.userId,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
            expiresAt,
            createdAt: time.effectiveNow,
          },
        });
      })
    );

    if (result.isSuccess) {
      return Result.success(undefined);
    }

    if (result.getError() instanceof SessionUserNotFoundError) {
      return Result.fail(
        AuthenticationError.userNotFound(
          "User not found",
          "The user with the provided ID does not exist"
        )
      );
    }

    if (result.getError() instanceof SessionUserNotEligibleError) {
      return Result.fail(
        AuthenticationError.userNotVerifiedOrBlocked(
          "Invalid credentials",
          "The provided credentials cannot be used to start a session"
        )
      );
    }

    return Result.fail(
      AuthenticationError.internalServerError(
        "Session replacement failed",
        "An error occurred while replacing the active session"
      )
    );
  };
}
