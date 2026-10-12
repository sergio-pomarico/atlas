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
  jest,
} from "@jest/globals";
import { ArgonPasswordHasher } from "@modules/auth/infrastructure/password-hasher-impl.ts";
import type { JWTService } from "@shared/infrastructure/services/jwt.ts";
import type { Application } from "express";
import request from "supertest";

const mockGetSecret =
  jest.fn<(key: string) => Promise<{ secretValue: string }>>();

jest.unstable_mockModule(
  "@shared/infrastructure/services/secret-manager.ts",
  () => ({
    SecretManagerService: {
      getInstance: jest.fn(() => ({
        getSecret: mockGetSecret,
      })),
    },
  })
);

const mockJWTService = {
  sign: jest.fn<JWTService["sign"]>(),
  verify: jest.fn<JWTService["verify"]>(),
};
const accessTokens = new Map<string, { sub: string; sid: string }>();
const loopbackAddressPattern = /127\.0\.0\.1/;

describe("POST /api/auth/login e2e", () => {
  let postgres: StartedPostgresTestDatabase;
  let app: Application;
  let passwordHasher: ArgonPasswordHasher;

  beforeAll(async () => {
    const { default: sharedContainer } = await import(
      "@shared/infrastructure/container.ts"
    );
    const { default: authContainer } = await import(
      "@modules/auth/infrastructure/container.ts"
    );
    const { Server } = await import("@shared/infrastructure/server.ts");

    postgres = await startPostgresTestDatabase();
    sharedContainer
      .rebindSync("PrismaService")
      .toConstantValue(postgres.prismaService);
    authContainer
      .rebindSync<JWTService>("JWTService")
      .toConstantValue(mockJWTService as unknown as JWTService);
    app = new Server(0).app;
    passwordHasher = new ArgonPasswordHasher();
  }, 60_000);

  beforeEach(async () => {
    jest.clearAllMocks();
    accessTokens.clear();
    mockJWTService.sign.mockImplementation((payload) => {
      if (payload.scope !== "access" || !("sid" in payload)) {
        return Promise.resolve(null);
      }
      const token = `test-access-token-${payload.sid}`;
      accessTokens.set(token, { sub: payload.sub, sid: payload.sid });
      return Promise.resolve(token);
    });
    mockJWTService.verify.mockImplementation((token) => {
      const claims = accessTokens.get(token);
      return Promise.resolve(
        claims
          ? {
              ...claims,
              scope: "access" as const,
              iat: 1,
              exp: 2,
              iss: "atlas-api",
              aud: "atlas-client",
            }
          : null
      );
    });
    await postgres.prisma.session.deleteMany();
    await postgres.prisma.user.deleteMany();
  });

  afterAll(async () => {
    await postgres?.stop();
  }, 60_000);

  it("logs in an active verified user", async () => {
    const user = await createUser({
      email: "active@example.com",
      password: "Password123!",
      failedLoginAttempts: 3,
    });

    const response = await request(app)
      .post("/api/auth/login")
      .set("User-Agent", "Atlas e2e client")
      .send({
        email: "active@example.com",
        password: "Password123!",
      });
    const updatedUser = await postgres.prisma.user.findUniqueOrThrow({
      where: { email: "active@example.com" },
    });
    const sessions = await postgres.prisma.session.findMany({
      where: { userId: user.id },
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "success",
      message: "User logged in successfully",
      data: {
        accessToken: expect.stringContaining("test-access-token-"),
      },
    });
    expect(sessions).toHaveLength(1);
    const session = sessions[0] as (typeof sessions)[number];
    expect(mockJWTService.sign).toHaveBeenCalledWith(
      {
        sub: user.id,
        scope: "access",
        sid: session.id,
      },
      "access",
      { expiresIn: "5m" }
    );
    expect(updatedUser.failedLoginAttempts).toBe(0);
    expect(session.revokedAt).toBeNull();
    expect(session.ipAddress).toMatch(loopbackAddressPattern);
    expect(session.userAgent).toBe("Atlas e2e client");
    expect(session.expiresAt.getTime() - session.createdAt.getTime()).toBe(
      30 * 24 * 60 * 60 * 1000
    );
  });

  it("revokes the first session on a second successful login", async () => {
    const user = await createUser({
      email: "twice@example.com",
      password: "Password123!",
    });

    const firstLogin = await request(app).post("/api/auth/login").send({
      email: "twice@example.com",
      password: "Password123!",
    });
    await request(app).post("/api/auth/login").send({
      email: "twice@example.com",
      password: "Password123!",
    });
    const sessions = await postgres.prisma.session.findMany({
      where: { userId: user.id },
    });

    expect(sessions).toHaveLength(2);
    expect(
      sessions.filter((session) => session.revokedAt === null)
    ).toHaveLength(1);
    await expect(
      request(app)
        .delete("/api/auth/logout")
        .set("Authorization", firstLogin.body.data.accessToken)
    ).resolves.toMatchObject({ status: 401 });
  });

  it("logs out the current session and rejects the same token afterwards", async () => {
    await createUser({ email: "logout@example.com", password: "Password123!" });
    const login = await request(app).post("/api/auth/login").send({
      email: "logout@example.com",
      password: "Password123!",
    });
    const token = login.body.data.accessToken as string;

    await expect(
      request(app).delete("/api/auth/logout").set("Authorization", token)
    ).resolves.toMatchObject({ status: 204 });
    await expect(
      request(app).delete("/api/auth/logout").set("Authorization", token)
    ).resolves.toMatchObject({ status: 401 });
  });

  it("rejects a token after its user is blocked", async () => {
    const user = await createUser({
      email: "blocked-after-login@example.com",
      password: "Password123!",
    });
    const login = await request(app).post("/api/auth/login").send({
      email: "blocked-after-login@example.com",
      password: "Password123!",
    });
    await postgres.prisma.user.update({
      where: { id: user.id },
      data: { status: UserStatus.BLOCKED },
    });

    await expect(
      request(app)
        .delete("/api/auth/logout")
        .set("Authorization", login.body.data.accessToken)
    ).resolves.toMatchObject({ status: 401 });
  });

  it("rejects a token after its session expires", async () => {
    const user = await createUser({
      email: "expired-after-login@example.com",
      password: "Password123!",
    });
    const login = await request(app).post("/api/auth/login").send({
      email: "expired-after-login@example.com",
      password: "Password123!",
    });
    await postgres.prisma.session.updateMany({
      where: { userId: user.id },
      data: { expiresAt: new Date("2020-01-01T00:00:00.000Z") },
    });

    await expect(
      request(app)
        .delete("/api/auth/logout")
        .set("Authorization", login.body.data.accessToken)
    ).resolves.toMatchObject({ status: 401 });
  });

  it("ignores X-Forwarded-For and stores the direct connection IP", async () => {
    const user = await createUser({
      email: "forwarded@example.com",
      password: "Password123!",
    });

    await request(app)
      .post("/api/auth/login")
      .set("X-Forwarded-For", "203.0.113.99")
      .send({
        email: "forwarded@example.com",
        password: "Password123!",
      });
    const session = await postgres.prisma.session.findFirstOrThrow({
      where: { userId: user.id },
    });

    expect(session.ipAddress).not.toBe("203.0.113.99");
    expect(session.ipAddress).toMatch(loopbackAddressPattern);
  });

  it("truncates a hostile user-agent to the database limit", async () => {
    const user = await createUser({
      email: "agent@example.com",
      password: "Password123!",
    });

    const response = await request(app)
      .post("/api/auth/login")
      .set("User-Agent", `  ${"x".repeat(700)}  `)
      .send({
        email: "agent@example.com",
        password: "Password123!",
      });
    const session = await postgres.prisma.session.findFirstOrThrow({
      where: { userId: user.id },
    });

    expect(response.status).toBe(200);
    expect(session.userAgent).toBe("x".repeat(512));
  });

  it.each([
    ["rejects", new Error("JWT failed")],
    ["returns null", null],
  ])(
    "does not create a session when JWT signing %s",
    async (_label, failure) => {
      const user = await createUser({
        email: "jwt-failure@example.com",
        password: "Password123!",
        failedLoginAttempts: 3,
      });
      if (failure instanceof Error) {
        mockJWTService.sign.mockRejectedValue(failure);
      } else {
        mockJWTService.sign.mockResolvedValue(failure);
      }

      const response = await request(app).post("/api/auth/login").send({
        email: "jwt-failure@example.com",
        password: "Password123!",
      });
      const updatedUser = await postgres.prisma.user.findUniqueOrThrow({
        where: { id: user.id },
      });

      expect(response.status).toBe(500);
      expect(updatedUser.failedLoginAttempts).toBe(0);
      expect(await postgres.prisma.session.count()).toBe(0);
    }
  );

  it("rejects an inactive user without creating a session", async () => {
    await createUser({
      email: "inactive@example.com",
      password: "Password123!",
      status: UserStatus.INACTIVE,
    });

    const response = await request(app).post("/api/auth/login").send({
      email: "inactive@example.com",
      password: "Password123!",
    });

    expect(response.status).toBe(403);
    expect(await postgres.prisma.session.count()).toBe(0);
  });

  it("returns not found when the user does not exist", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "missing@example.com",
      password: "Password123!",
    });

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      status: "error",
      message: "Invalid credentials",
      error: {
        code: "NOT_FOUND",
        description: "The provided email or password is incorrect",
      },
    });
    expect(mockJWTService.sign).not.toHaveBeenCalled();
  });

  it("returns bad request and increments failed attempts when the password is invalid", async () => {
    const user = await createUser({
      email: "wrong-password@example.com",
      password: "Password123!",
    });

    const response = await request(app).post("/api/auth/login").send({
      email: "wrong-password@example.com",
      password: "WrongPassword123!",
    });
    const updatedUser = await postgres.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      status: "error",
      message: "Invalid credentials",
      error: {
        code: "BAD_REQUEST",
        description: "The provided email or password is incorrect",
      },
    });
    expect(updatedUser.failedLoginAttempts).toBe(1);
    expect(mockJWTService.sign).not.toHaveBeenCalled();
  });

  it("returns bad request when the email format is invalid", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "invalid-email",
      password: "Password123!",
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      status: "error",
      message: "the data provided is invalid",
      error: {
        code: "BAD_REQUEST",
        description: expect.stringContaining("email"),
      },
    });
    expect(mockJWTService.sign).not.toHaveBeenCalled();
  });

  it("returns bad request when required login fields are missing", async () => {
    const response = await request(app).post("/api/auth/login").send({});

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      status: "error",
      message: "the data provided is invalid",
      error: {
        code: "BAD_REQUEST",
      },
    });
    expect(response.body.error.description).toEqual(
      expect.stringContaining("email")
    );
    expect(response.body.error.description).toEqual(
      expect.stringContaining("password")
    );
    expect(mockJWTService.sign).not.toHaveBeenCalled();
  });

  it("returns forbidden when the user is blocked", async () => {
    await createUser({
      email: "blocked@example.com",
      password: "Password123!",
      status: UserStatus.BLOCKED,
    });

    const response = await request(app).post("/api/auth/login").send({
      email: "blocked@example.com",
      password: "Password123!",
    });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      status: "error",
      message: "Invalid credentials",
      error: {
        code: "FORBIDDEN",
        description: "The provided email or password is incorrect",
      },
    });
    expect(mockJWTService.sign).not.toHaveBeenCalled();
  });

  it("returns forbidden when the user is not verified", async () => {
    await createUser({
      email: "not-verified@example.com",
      password: "Password123!",
      verified: false,
    });

    const response = await request(app).post("/api/auth/login").send({
      email: "not-verified@example.com",
      password: "Password123!",
    });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      status: "error",
      message: "Invalid credentials",
      error: {
        code: "FORBIDDEN",
        description: "The provided email or password is incorrect",
      },
    });
    expect(mockJWTService.sign).not.toHaveBeenCalled();
  });

  async function createUser({
    email,
    password,
    status = UserStatus.ACTIVE,
    verified = true,
    failedLoginAttempts = 0,
  }: {
    email: string;
    password: string;
    status?: (typeof UserStatus)[keyof typeof UserStatus];
    verified?: boolean;
    failedLoginAttempts?: number;
  }) {
    return postgres.prisma.user.create({
      data: {
        email,
        failedLoginAttempts,
        password: await passwordHasher.hash(password),
        phone: phoneFromEmail(email),
        status,
        verified,
      },
    });
  }
});

function phoneFromEmail(email: string): string {
  const digits = email.replace(/\D/g, "").padEnd(10, "0");
  return digits.slice(0, 10);
}
