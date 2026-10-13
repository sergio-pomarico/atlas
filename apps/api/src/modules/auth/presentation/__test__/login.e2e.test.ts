import { UserStatus } from "@atlas/entities/user.ts";
import {
  type AuthE2EContext,
  startAuthE2EContext,
} from "@helpers/test/auth-e2e.ts";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "@jest/globals";
import request from "supertest";

const loopbackAddressPattern = /127\.0\.0\.1/;

describe("POST /api/auth/login e2e", () => {
  let context: AuthE2EContext;

  beforeAll(async () => {
    context = await startAuthE2EContext();
  }, 60_000);

  beforeEach(async () => {
    await context.reset();
  });

  afterAll(async () => {
    await context?.stop();
  }, 60_000);

  it("logs in an active verified user", async () => {
    const user = await context.createUser({
      email: "active@example.com",
      password: "Password123!",
      failedLoginAttempts: 3,
    });

    const response = await request(context.app)
      .post("/api/auth/login")
      .set("User-Agent", "Atlas e2e client")
      .send({
        email: "active@example.com",
        password: "Password123!",
      });
    const updatedUser = await context.postgres.prisma.user.findUniqueOrThrow({
      where: { email: "active@example.com" },
    });
    const sessions = await context.postgres.prisma.session.findMany({
      where: { userId: user.id },
    });
    const refreshCookies = response.headers["set-cookie"];
    const refreshCookie = String(refreshCookies);

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
    expect(context.mockJWTService.sign).toHaveBeenCalledWith(
      {
        sub: user.id,
        scope: "access",
        sid: session.id,
      },
      "access",
      { expiresIn: "5m" }
    );
    expect(context.mockJWTService.sign).toHaveBeenCalledWith(
      {
        sub: user.id,
        scope: "refresh",
        sid: session.id,
        exp: session.expiresAt.getTime() / 1000,
      },
      "refresh"
    );
    expect(refreshCookies).toEqual([
      expect.stringContaining(`refresh_token=test-refresh-token-${session.id}`),
    ]);
    expect(refreshCookie).toContain("HttpOnly");
    expect(refreshCookie).toContain("SameSite=Lax");
    expect(refreshCookie).toContain("Path=/api/auth");
    expect(refreshCookie).toContain(
      `Expires=${session.expiresAt.toUTCString()}`
    );
    expect(updatedUser.failedLoginAttempts).toBe(0);
    expect(session.revokedAt).toBeNull();
    expect(session.ipAddress).toMatch(loopbackAddressPattern);
    expect(session.userAgent).toBe("Atlas e2e client");
    const effectiveLifetime =
      session.expiresAt.getTime() - session.createdAt.getTime();
    const configuredLifetime = 30 * 24 * 60 * 60 * 1000;
    expect(effectiveLifetime).toBeLessThanOrEqual(configuredLifetime);
    expect(effectiveLifetime).toBeGreaterThan(configuredLifetime - 5000);
  });

  it("revokes the first session on a second successful login", async () => {
    const user = await context.createUser({
      email: "twice@example.com",
      password: "Password123!",
    });

    const firstLogin = await request(context.app).post("/api/auth/login").send({
      email: "twice@example.com",
      password: "Password123!",
    });
    await request(context.app).post("/api/auth/login").send({
      email: "twice@example.com",
      password: "Password123!",
    });
    const sessions = await context.postgres.prisma.session.findMany({
      where: { userId: user.id },
    });

    expect(sessions).toHaveLength(2);
    expect(
      sessions.filter((session) => session.revokedAt === null)
    ).toHaveLength(1);
    await expect(
      request(context.app)
        .delete("/api/auth/logout")
        .set("Authorization", firstLogin.body.data.accessToken)
    ).resolves.toMatchObject({ status: 401 });
  });

  it("ignores X-Forwarded-For and stores the direct connection IP", async () => {
    const user = await context.createUser({
      email: "forwarded@example.com",
      password: "Password123!",
    });

    await request(context.app)
      .post("/api/auth/login")
      .set("X-Forwarded-For", "203.0.113.99")
      .send({
        email: "forwarded@example.com",
        password: "Password123!",
      });
    const session = await context.postgres.prisma.session.findFirstOrThrow({
      where: { userId: user.id },
    });

    expect(session.ipAddress).not.toBe("203.0.113.99");
    expect(session.ipAddress).toMatch(loopbackAddressPattern);
  });

  it("truncates a hostile user-agent to the database limit", async () => {
    const user = await context.createUser({
      email: "agent@example.com",
      password: "Password123!",
    });

    const response = await request(context.app)
      .post("/api/auth/login")
      .set("User-Agent", `  ${"x".repeat(700)}  `)
      .send({
        email: "agent@example.com",
        password: "Password123!",
      });
    const session = await context.postgres.prisma.session.findFirstOrThrow({
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
      const user = await context.createUser({
        email: "jwt-failure@example.com",
        password: "Password123!",
        failedLoginAttempts: 3,
      });
      if (failure instanceof Error) {
        context.mockJWTService.sign.mockRejectedValue(failure);
      } else {
        context.mockJWTService.sign.mockResolvedValue(failure);
      }

      const response = await request(context.app).post("/api/auth/login").send({
        email: "jwt-failure@example.com",
        password: "Password123!",
      });
      const updatedUser = await context.postgres.prisma.user.findUniqueOrThrow({
        where: { id: user.id },
      });

      expect(response.status).toBe(500);
      expect(updatedUser.failedLoginAttempts).toBe(0);
      expect(await context.postgres.prisma.session.count()).toBe(0);
    }
  );

  it("rejects an inactive user without creating a session", async () => {
    await context.createUser({
      email: "inactive@example.com",
      password: "Password123!",
      status: UserStatus.INACTIVE,
    });

    const response = await request(context.app).post("/api/auth/login").send({
      email: "inactive@example.com",
      password: "Password123!",
    });

    expect(response.status).toBe(403);
    expect(await context.postgres.prisma.session.count()).toBe(0);
  });

  it("returns not found when the user does not exist", async () => {
    const response = await request(context.app).post("/api/auth/login").send({
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
    expect(context.mockJWTService.sign).not.toHaveBeenCalled();
  });

  it("returns bad request and increments failed attempts when the password is invalid", async () => {
    const user = await context.createUser({
      email: "wrong-password@example.com",
      password: "Password123!",
    });

    const response = await request(context.app).post("/api/auth/login").send({
      email: "wrong-password@example.com",
      password: "WrongPassword123!",
    });
    const updatedUser = await context.postgres.prisma.user.findUniqueOrThrow({
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
    expect(context.mockJWTService.sign).not.toHaveBeenCalled();
  });

  it("returns bad request when the email format is invalid", async () => {
    const response = await request(context.app).post("/api/auth/login").send({
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
    expect(context.mockJWTService.sign).not.toHaveBeenCalled();
  });

  it("returns bad request when required login fields are missing", async () => {
    const response = await request(context.app)
      .post("/api/auth/login")
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      status: "error",
      message: "the data provided is invalid",
      error: { code: "BAD_REQUEST" },
    });
    expect(response.body.error.description).toEqual(
      expect.stringContaining("email")
    );
    expect(response.body.error.description).toEqual(
      expect.stringContaining("password")
    );
    expect(context.mockJWTService.sign).not.toHaveBeenCalled();
  });

  it("returns forbidden when the user is blocked", async () => {
    await context.createUser({
      email: "blocked@example.com",
      password: "Password123!",
      status: UserStatus.BLOCKED,
    });

    const response = await request(context.app).post("/api/auth/login").send({
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
    expect(context.mockJWTService.sign).not.toHaveBeenCalled();
  });

  it("returns forbidden when the user is not verified", async () => {
    await context.createUser({
      email: "not-verified@example.com",
      password: "Password123!",
      verified: false,
    });

    const response = await request(context.app).post("/api/auth/login").send({
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
    expect(context.mockJWTService.sign).not.toHaveBeenCalled();
  });
});
