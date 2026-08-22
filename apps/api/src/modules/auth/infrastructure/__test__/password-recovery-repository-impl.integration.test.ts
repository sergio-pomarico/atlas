import { UserStatus, type UserStatusType } from "@atlas/entities/user.ts";
import {
  type StartedPostgresTestDatabase,
  startPostgresTestDatabase,
} from "@helpers/test/postgres.ts";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "@jest/globals";
import { PrismaPasswordRecoveryRepository } from "@modules/auth/infrastructure/password-recovery-repository-impl.ts";

const now = new Date("2026-08-21T12:00:00.000Z");

describe("PrismaPasswordRecoveryRepository integration", () => {
  let postgres: StartedPostgresTestDatabase;
  let repository: PrismaPasswordRecoveryRepository;

  beforeAll(async () => {
    postgres = await startPostgresTestDatabase();
    repository = new PrismaPasswordRecoveryRepository(postgres.prismaService);
  }, 60_000);

  beforeEach(async () => {
    await postgres.prisma.passwordResetRequest.deleteMany();
    await postgres.prisma.session.deleteMany();
    await postgres.prisma.user.deleteMany();
  });

  afterAll(async () => {
    await postgres?.stop();
  }, 60_000);

  it("distinguishes a missing user from an ineligible user", async () => {
    await createUser({
      email: "inactive@example.com",
      status: UserStatus.INACTIVE,
    });

    await expect(
      repository.createPendingRequest("missing@example.com", "hash", now)
    ).resolves.toEqual({ type: "userNotFound" });
    await expect(
      repository.createPendingRequest("inactive@example.com", "hash", now)
    ).resolves.toEqual({ type: "userNotEligible" });
  });

  it("creates a pending request without invalidating the current active request", async () => {
    const user = await createUser();
    const active = await createActiveRequest(user.id);

    const result = await repository.createPendingRequest(
      user.email,
      "new-hash",
      now
    );

    expect(result.type).toBe("created");
    const requests = await postgres.prisma.passwordResetRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });
    expect(requests).toHaveLength(2);
    expect(requests.find((request) => request.id === active.id)?.status).toBe(
      "ACTIVE"
    );
    expect(
      requests.find((request) => request.codeHash === "new-hash")?.status
    ).toBe("PENDING");
  });

  it("invalidates abandoned pending requests while retaining active requests", async () => {
    const user = await createUser();
    const active = await createActiveRequest(user.id);
    const abandoned = await postgres.prisma.passwordResetRequest.create({
      data: {
        userId: user.id,
        codeHash: "abandoned-hash",
        status: "PENDING",
        createdAt: new Date(now.getTime() - 2 * 60_000 - 1),
      },
    });

    const result = await repository.cleanupAbandonedPendingRequests(now);

    expect(result).toEqual({ type: "cleaned", count: 1 });
    await expect(
      postgres.prisma.passwordResetRequest.findUniqueOrThrow({
        where: { id: active.id },
      })
    ).resolves.toMatchObject({ status: "ACTIVE", invalidatedAt: null });
    await expect(
      postgres.prisma.passwordResetRequest.findUniqueOrThrow({
        where: { id: abandoned.id },
      })
    ).resolves.toMatchObject({ status: "INVALIDATED", invalidatedAt: now });
  });

  it("activates the expected pending request after invalidating the prior active request", async () => {
    const user = await createUser();
    const active = await createActiveRequest(user.id);
    const created = await repository.createPendingRequest(
      user.email,
      "new-hash",
      now
    );
    if (created.type !== "created") {
      throw new Error("Expected a pending request");
    }

    await expect(
      repository.activatePendingRequest(created.requestId, now)
    ).resolves.toEqual({ type: "activated" });

    await expect(
      postgres.prisma.passwordResetRequest.findUniqueOrThrow({
        where: { id: active.id },
      })
    ).resolves.toMatchObject({ status: "INVALIDATED", invalidatedAt: now });
    await expect(
      postgres.prisma.passwordResetRequest.findUniqueOrThrow({
        where: { id: created.requestId },
      })
    ).resolves.toMatchObject({
      status: "ACTIVE",
      activatedAt: now,
      expiresAt: new Date(now.getTime() + 15 * 60_000),
    });
    await expect(
      repository.activatePendingRequest(created.requestId, now)
    ).resolves.toEqual({ type: "requestNotActivatable" });
  });

  it("preserves an active request when the pending request can no longer activate", async () => {
    const user = await createUser();
    const active = await createActiveRequest(user.id);
    const created = await repository.createPendingRequest(
      user.email,
      "new-hash",
      now
    );
    if (created.type !== "created") {
      throw new Error("Expected a pending request");
    }
    await postgres.prisma.user.update({
      where: { id: user.id },
      data: { status: "INACTIVE" },
    });

    await expect(
      repository.activatePendingRequest(created.requestId, now)
    ).resolves.toEqual({ type: "userNotEligible" });
    await expect(
      postgres.prisma.passwordResetRequest.findUniqueOrThrow({
        where: { id: active.id },
      })
    ).resolves.toMatchObject({ status: "ACTIVE", invalidatedAt: null });
  });

  it("serializes concurrent activations and leaves exactly one active request", async () => {
    const user = await createUser();
    const first = await repository.createPendingRequest(
      user.email,
      "first-hash",
      now
    );
    const second = await repository.createPendingRequest(
      user.email,
      "second-hash",
      now
    );
    if (first.type !== "created" || second.type !== "created") {
      throw new Error("Expected pending requests");
    }

    const results = await Promise.all([
      repository.activatePendingRequest(first.requestId, now),
      repository.activatePendingRequest(second.requestId, now),
    ]);

    expect(results).toEqual([{ type: "activated" }, { type: "activated" }]);
    await expect(
      postgres.prisma.passwordResetRequest.count({
        where: { userId: user.id, status: "ACTIVE" },
      })
    ).resolves.toBe(1);
  });

  function createUser(
    overrides: Partial<{
      email: string;
      status: UserStatusType;
      verified: boolean;
    }> = {}
  ) {
    return postgres.prisma.user.create({
      data: {
        email: overrides.email ?? "eligible@example.com",
        phone: "3011234567",
        password: "password-hash",
        status: overrides.status ?? UserStatus.ACTIVE,
        verified: overrides.verified ?? true,
      },
    });
  }

  function createActiveRequest(userId: string) {
    return postgres.prisma.passwordResetRequest.create({
      data: {
        userId,
        codeHash: "active-hash",
        status: "ACTIVE",
        activatedAt: now,
        expiresAt: new Date(now.getTime() + 15 * 60_000),
      },
    });
  }
});
