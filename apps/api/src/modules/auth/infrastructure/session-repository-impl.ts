import AuthenticationError from "@modules/auth/domain/error/index.ts";
import type {
  CreateSessionInput,
  SessionIdentity,
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
  eligible: boolean;
}

interface EffectiveTimeRow {
  effectiveNow: Date;
}

interface SessionValidityRow {
  valid: boolean;
}

const millisecondsPerDay = 24 * 60 * 60 * 1000;

function isSessionTtlValid(sessionTtlDays: number): boolean {
  return (
    Number.isInteger(sessionTtlDays) &&
    sessionTtlDays >= 1 &&
    sessionTtlDays <= 90
  );
}

function assertSessionUserIsEligible(users: LockedUserRow[]): void {
  const [user] = users;
  if (!user) {
    throw new SessionUserNotFoundError();
  }

  if (!user.eligible) {
    throw new SessionUserNotEligibleError();
  }
}

function mapSessionError(error: Error): AuthenticationError {
  if (error instanceof SessionUserNotFoundError) {
    return AuthenticationError.userNotFound();
  }

  if (error instanceof SessionUserNotEligibleError) {
    return AuthenticationError.sessionUserNotEligible();
  }

  return AuthenticationError.sessionReplacementFailed();
}

@injectable()
export class SessionRepositoryImpl implements SessionRepository {
  private readonly prismaService: PrismaService;

  constructor(@inject("PrismaService") prismaService: PrismaService) {
    this.prismaService = prismaService;
  }

  replaceActiveSession = async (
    input: CreateSessionInput
  ): Promise<Result<void, AuthenticationError>> => {
    if (!isSessionTtlValid(input.sessionTtlDays)) {
      return Result.fail(
        AuthenticationError.sessionLifetimeConfigurationInvalid()
      );
    }

    const result = await tryCatch<void, Error>(
      this.prismaService.getClient().$transaction(async (transaction) => {
        const users = await transaction.$queryRaw<LockedUserRow[]>`
          SELECT
            "id",
            ("status" = 'ACTIVE' AND "is_verified") AS "eligible"
          FROM "User"
          WHERE "id" = ${input.userId}
          FOR UPDATE
        `;

        assertSessionUserIsEligible(users);

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
            id: input.id,
            userId: input.userId,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
            expiresAt,
            createdAt: time.effectiveNow,
          },
        });
      })
    );

    return result.isSuccess
      ? Result.success(undefined)
      : Result.fail(mapSessionError(result.getError()));
  };

  validateActiveSession = async (
    identity: SessionIdentity
  ): Promise<Result<boolean, AuthenticationError>> => {
    const result = await tryCatch<SessionValidityRow[], Error>(
      this.prismaService.getClient().$queryRaw<SessionValidityRow[]>`
        SELECT EXISTS (
          SELECT 1
          FROM "Session" AS "session"
          INNER JOIN "User" AS "user" ON "user"."id" = "session"."user_id"
          WHERE "session"."id" = ${identity.sessionId}
            AND "session"."user_id" = ${identity.userId}
            AND "session"."revoked_at" IS NULL
            AND "session"."expires_at" > clock_timestamp()
            AND "user"."status" = 'ACTIVE'
            AND "user"."is_verified"
        ) AS "valid"
      `
    );
    if (!result.isSuccess) {
      return Result.fail(AuthenticationError.sessionValidationFailed());
    }
    return Result.success(result.getData()[0]?.valid ?? false);
  };

  revokeActiveSession = async (
    identity: SessionIdentity
  ): Promise<Result<boolean, AuthenticationError>> => {
    const result = await tryCatch<Array<{ id: string }>, Error>(
      this.prismaService.getClient().$queryRaw<Array<{ id: string }>>`
        UPDATE "Session"
        SET "revoked_at" = clock_timestamp()
        WHERE "id" = ${identity.sessionId}
          AND "user_id" = ${identity.userId}
          AND "revoked_at" IS NULL
          AND "expires_at" > clock_timestamp()
        RETURNING "id"
      `
    );
    return result.isSuccess
      ? Result.success(result.getData().length === 1)
      : Result.fail(AuthenticationError.sessionRevocationFailed());
  };
}
