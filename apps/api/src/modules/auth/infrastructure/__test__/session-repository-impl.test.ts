import { UserStatus } from "@atlas/entities/user.ts";
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
import AuthenticationError from "@modules/auth/domain/error.ts";
import { SessionRepositoryImpl } from "@modules/auth/infrastructure/session-repository-impl.ts";

describe("SessionRepositoryImpl integration", () => {
  let postgres: StartedPostgresTestDatabase;
  let repository: SessionRepositoryImpl;

  beforeAll(async () => {
    postgres = await startPostgresTestDatabase();
    repository = new SessionRepositoryImpl(postgres.prismaService);
  }, 60_000);

  beforeEach(async () => {
    await postgres.prisma.session.deleteMany();
    await postgres.prisma.user.deleteMany();
  });

  afterAll(async () => {
    await postgres?.stop();
  }, 60_000);

  it("creates the first open session", async () => {
    const user = await createUser("first@example.com", "3010000001");
    const before = await databaseClock();

    const result = await repository.replaceActiveSession(
      sessionInput(user.id, { userAgent: "test-agent" })
    );
    const after = await databaseClock();
    const sessions = await postgres.prisma.session.findMany();

    expect(result.isSuccess).toBe(true);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({
      userId: user.id,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent",
      revokedAt: null,
    });
    expect(sessions[0]?.createdAt.getTime()).toBeGreaterThanOrEqual(
      before.getTime()
    );
    expect(sessions[0]?.createdAt.getTime()).toBeLessThanOrEqual(
      after.getTime()
    );
    expect(
      (sessions[0]?.expiresAt.getTime() as number) -
        (sessions[0]?.createdAt.getTime() as number)
    ).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it("revokes the previous session and preserves its history", async () => {
    const user = await createUser("second@example.com", "3010000002");
    await repository.replaceActiveSession(sessionInput(user.id));

    const result = await repository.replaceActiveSession(sessionInput(user.id));
    const sessions = await postgres.prisma.session.findMany({
      where: { userId: user.id },
    });
    const previous = sessions.find((session) => session.revokedAt !== null);
    const current = sessions.find((session) => session.revokedAt === null);

    expect(result.isSuccess).toBe(true);
    expect(sessions).toHaveLength(2);
    expect(previous?.revokedAt).toEqual(current?.createdAt);
  });

  it("revokes an expired session that is still open", async () => {
    const user = await createUser("expired@example.com", "3010000003");
    const expired = await postgres.prisma.session.create({
      data: {
        userId: user.id,
        ipAddress: "127.0.0.1",
        expiresAt: new Date("2026-08-01T00:00:00.000Z"),
      },
    });
    await repository.replaceActiveSession(sessionInput(user.id));
    const previous = await postgres.prisma.session.findUniqueOrThrow({
      where: { id: expired.id },
    });
    const current = await postgres.prisma.session.findFirstOrThrow({
      where: { userId: user.id, revokedAt: null },
    });

    expect(previous.revokedAt).toEqual(current.createdAt);
  });

  it("keeps open sessions independently for different users", async () => {
    const firstUser = await createUser("one@example.com", "3010000004");
    const secondUser = await createUser("two@example.com", "3010000005");

    const results = await Promise.all([
      repository.replaceActiveSession(sessionInput(firstUser.id)),
      repository.replaceActiveSession(sessionInput(secondUser.id)),
    ]);
    const openSessions = await postgres.prisma.session.count({
      where: { revokedAt: null },
    });

    expect(results.every((result) => result.isSuccess)).toBe(true);
    expect(openSessions).toBe(2);
  });

  it("rolls back the revocation when creating the replacement fails", async () => {
    const user = await createUser("rollback@example.com", "3010000006");
    const original = await postgres.prisma.session.create({
      data: {
        userId: user.id,
        ipAddress: "127.0.0.1",
        expiresAt: new Date("2026-10-01T00:00:00.000Z"),
      },
    });

    const result = await repository.replaceActiveSession({
      ...sessionInput(user.id),
      ipAddress: "x".repeat(46),
    });
    const persisted = await postgres.prisma.session.findUniqueOrThrow({
      where: { id: original.id },
    });

    expect(result.isSuccess).toBe(false);
    expect(persisted.revokedAt).toBeNull();
    expect(await postgres.prisma.session.count()).toBe(1);
  });

  it("returns a controlled error for a missing user", async () => {
    const result = await repository.replaceActiveSession(
      sessionInput("missing-user")
    );

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBeInstanceOf(AuthenticationError);
    expect(result.getError().statusCode).toBe(404);
  });

  it.each([0, 1.5, 91])(
    "rejects invalid session TTL %p without changing data",
    async (sessionTtlDays) => {
      const user = await createUser(
        `ttl-${sessionTtlDays}@example.com`,
        `30300000${String(sessionTtlDays).replace(".", "").padStart(2, "0")}`
      );

      const result = await repository.replaceActiveSession(
        sessionInput(user.id, { sessionTtlDays })
      );

      expect(result.isSuccess).toBe(false);
      expect(result.getError().statusCode).toBe(500);
      expect(await postgres.prisma.session.count()).toBe(0);
    }
  );

  it("rechecks current user eligibility after waiting for the row lock", async () => {
    const user = await createUser("changed@example.com", "3010000007");
    const original = await postgres.prisma.session.create({
      data: {
        userId: user.id,
        ipAddress: "127.0.0.1",
        expiresAt: new Date("2026-10-01T00:00:00.000Z"),
      },
    });
    const replacementState: {
      promise?: ReturnType<SessionRepositoryImpl["replaceActiveSession"]>;
    } = {};

    await postgres.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT "id" FROM "User" WHERE "id" = ${user.id} FOR UPDATE
      `;
      replacementState.promise = repository.replaceActiveSession(
        sessionInput(user.id)
      );
      await waitForSessionReplacementLock();
      await transaction.user.update({
        where: { id: user.id },
        data: { status: UserStatus.INACTIVE },
      });
    });

    if (!replacementState.promise) {
      throw new Error("Session replacement did not start");
    }
    const result = await replacementState.promise;
    const persisted = await postgres.prisma.session.findUniqueOrThrow({
      where: { id: original.id },
    });

    expect(result.isSuccess).toBe(false);
    expect(result.getError().statusCode).toBe(403);
    expect(persisted.revokedAt).toBeNull();
    expect(await postgres.prisma.session.count()).toBe(1);
  });

  it.each([
    ["inactive", UserStatus.INACTIVE, true, "3020000001"],
    ["blocked", UserStatus.BLOCKED, true, "3020000002"],
    ["unverified", UserStatus.ACTIVE, false, "3020000003"],
  ])(
    "does not change sessions for a currently %s user",
    async (_label, status, verified, phone) => {
      const user = await createUser(`${_label}@example.com`, phone, {
        status,
        verified,
      });
      const original = await postgres.prisma.session.create({
        data: {
          userId: user.id,
          ipAddress: "127.0.0.1",
          expiresAt: new Date("2026-10-01T00:00:00.000Z"),
        },
      });

      const result = await repository.replaceActiveSession(
        sessionInput(user.id)
      );
      const persisted = await postgres.prisma.session.findUniqueOrThrow({
        where: { id: original.id },
      });

      expect(result.isSuccess).toBe(false);
      expect(result.getError().statusCode).toBe(403);
      expect(persisted.revokedAt).toBeNull();
      expect(await postgres.prisma.session.count()).toBe(1);
    }
  );

  it("serializes replacements that are waiting on the same user lock", async () => {
    const user = await createUser("concurrent@example.com", "3010000007");
    let replacements: Promise<
      Awaited<ReturnType<SessionRepositoryImpl["replaceActiveSession"]>>
    >[] = [];

    await postgres.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT "id" FROM "User" WHERE "id" = ${user.id} FOR UPDATE
      `;
      replacements = [
        repository.replaceActiveSession(sessionInput(user.id)),
        repository.replaceActiveSession(sessionInput(user.id)),
      ];
      await waitForSessionReplacementLock();
    });
    const results = await Promise.all(replacements);

    expect(results.every((result) => result.isSuccess)).toBe(true);
    expect(
      await postgres.prisma.session.count({
        where: { userId: user.id, revokedAt: null },
      })
    ).toBe(1);
    expect(
      await postgres.prisma.session.count({ where: { userId: user.id } })
    ).toBe(2);
  });

  it("prevents two open sessions through direct inserts", async () => {
    const user = await createUser("index@example.com", "3010000008");
    await postgres.prisma.session.create({
      data: {
        userId: user.id,
        ipAddress: "127.0.0.1",
        expiresAt: new Date("2026-10-01T00:00:00.000Z"),
      },
    });

    await expect(
      postgres.prisma.session.create({
        data: {
          userId: user.id,
          ipAddress: "127.0.0.2",
          expiresAt: new Date("2026-10-02T00:00:00.000Z"),
        },
      })
    ).rejects.toThrow();
  });

  function createUser(
    email: string,
    phone: string,
    overrides: {
      status?: (typeof UserStatus)[keyof typeof UserStatus];
      verified?: boolean;
    } = {}
  ) {
    return postgres.prisma.user.create({
      data: {
        email,
        phone,
        password: "hashed-password",
        status: overrides.status ?? UserStatus.ACTIVE,
        verified: overrides.verified ?? true,
      },
    });
  }

  async function databaseClock(): Promise<Date> {
    const [row] = await postgres.prisma.$queryRaw<Array<{ now: Date }>>`
      SELECT clock_timestamp() AS "now"
    `;
    if (!row) {
      throw new Error("Database clock did not return a timestamp");
    }
    return row.now;
  }

  async function waitForSessionReplacementLock(): Promise<void> {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const [row] = await postgres.prisma.$queryRaw<
        Array<{ waiting: boolean }>
      >`
        SELECT EXISTS (
          SELECT 1
          FROM pg_stat_activity
          WHERE pid <> pg_backend_pid()
            AND wait_event_type = 'Lock'
            AND query LIKE '%FROM "User"%FOR UPDATE%'
        ) AS "waiting"
      `;
      if (row?.waiting) {
        return;
      }
    }
    throw new Error("Session replacement did not wait for the user row lock");
  }
});

function sessionInput(
  userId: string,
  overrides: { userAgent?: string | null; sessionTtlDays?: number } = {}
) {
  return {
    userId,
    ipAddress: "127.0.0.1",
    userAgent: overrides.userAgent ?? null,
    sessionTtlDays: overrides.sessionTtlDays ?? 30,
  };
}
