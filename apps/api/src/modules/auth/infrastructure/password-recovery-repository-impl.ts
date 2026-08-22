import type {
  ActivatePasswordResetRequestResult,
  CleanupPendingPasswordResetRequestsResult,
  CreatePendingPasswordResetRequestResult,
  PasswordRecoveryRepository,
} from "@modules/auth/domain/password-recovery-repository.ts";
import type { PrismaService } from "@shared/infrastructure/services/prisma.ts";
import { Prisma } from "generated/prisma/client.ts";
import { inject, injectable } from "inversify";

const PENDING_ABANDONED_AFTER_MS = 2 * 60_000;
const ACTIVE_REQUEST_DURATION_MS = 15 * 60_000;

class UserNotEligibleError extends Error {}
class RequestNotActivatableError extends Error {}

interface LockedUser {
  id: string;
  verified: boolean;
  status: "ACTIVE" | "INACTIVE" | "BLOCKED" | "DELETED";
}

function isEligible(user: LockedUser): boolean {
  return (
    user.verified && (user.status === "ACTIVE" || user.status === "BLOCKED")
  );
}

@injectable()
export class PrismaPasswordRecoveryRepository
  implements PasswordRecoveryRepository
{
  private readonly prismaService: PrismaService;

  constructor(@inject("PrismaService") prismaService: PrismaService) {
    this.prismaService = prismaService;
  }

  async createPendingRequest(
    email: string,
    codeHash: string,
    now: Date
  ): Promise<CreatePendingPasswordResetRequestResult> {
    try {
      return await this.prismaService.getClient().$transaction(async (tx) => {
        const users = await tx.$queryRaw<LockedUser[]>(Prisma.sql`
          SELECT "id", "is_verified" AS "verified", "status"
          FROM "User"
          WHERE "email" = ${email}
          FOR UPDATE
        `);
        const user = users[0];
        if (!user) {
          return { type: "userNotFound" };
        }
        if (!isEligible(user)) {
          return { type: "userNotEligible" };
        }

        await tx.passwordResetRequest.updateMany({
          where: {
            userId: user.id,
            status: "PENDING",
            createdAt: {
              lt: new Date(now.getTime() - PENDING_ABANDONED_AFTER_MS),
            },
          },
          data: { status: "INVALIDATED", invalidatedAt: now },
        });

        const request = await tx.passwordResetRequest.create({
          data: {
            userId: user.id,
            codeHash,
            status: "PENDING",
            createdAt: now,
          },
        });
        return { type: "created", requestId: request.id };
      });
    } catch {
      return { type: "infrastructureError" };
    }
  }

  async activatePendingRequest(
    requestId: string,
    now: Date
  ): Promise<ActivatePasswordResetRequestResult> {
    try {
      await this.prismaService.getClient().$transaction(async (tx) => {
        // Derive the user inside the query, then acquire its lock before the request lock.
        const users = await tx.$queryRaw<LockedUser[]>(Prisma.sql`
          SELECT "id", "is_verified" AS "verified", "status"
          FROM "User"
          WHERE "id" = (
            SELECT "user_id" FROM "PasswordResetRequest" WHERE "id" = ${requestId}
          )
          FOR UPDATE
        `);
        const user = users[0];
        if (!user) {
          throw new RequestNotActivatableError();
        }
        if (!isEligible(user)) {
          throw new UserNotEligibleError();
        }

        const requests = await tx.$queryRaw<{ id: string; status: string }[]>(
          Prisma.sql`
            SELECT "id", "status"
            FROM "PasswordResetRequest"
            WHERE "id" = ${requestId} AND "user_id" = ${user.id}
            FOR UPDATE
          `
        );
        if (requests[0]?.status !== "PENDING") {
          throw new RequestNotActivatableError();
        }

        await tx.passwordResetRequest.updateMany({
          where: { userId: user.id, status: "ACTIVE" },
          data: { status: "INVALIDATED", invalidatedAt: now },
        });
        const activated = await tx.passwordResetRequest.updateMany({
          where: { id: requestId, userId: user.id, status: "PENDING" },
          data: {
            status: "ACTIVE",
            activatedAt: now,
            expiresAt: new Date(now.getTime() + ACTIVE_REQUEST_DURATION_MS),
          },
        });
        if (activated.count !== 1) {
          throw new RequestNotActivatableError();
        }
      });
      return { type: "activated" };
    } catch (error) {
      if (error instanceof UserNotEligibleError) {
        return { type: "userNotEligible" };
      }
      if (error instanceof RequestNotActivatableError) {
        return { type: "requestNotActivatable" };
      }
      return { type: "infrastructureError" };
    }
  }

  async cleanupAbandonedPendingRequests(
    now: Date
  ): Promise<CleanupPendingPasswordResetRequestsResult> {
    try {
      const result = await this.prismaService
        .getClient()
        .passwordResetRequest.updateMany({
          where: {
            status: "PENDING",
            createdAt: {
              lt: new Date(now.getTime() - PENDING_ABANDONED_AFTER_MS),
            },
          },
          data: { status: "INVALIDATED", invalidatedAt: now },
        });
      return { type: "cleaned", count: result.count };
    } catch {
      return { type: "infrastructureError" };
    }
  }
}
