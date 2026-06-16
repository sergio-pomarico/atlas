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

describe("POST /api/auth/login e2e", () => {
  let postgres: StartedPostgresTestDatabase;
  let app: Application;
  let passwordHasher: ArgonPasswordHasher;

  beforeAll(async () => {
    const [
      { default: sharedContainer },
      { default: authContainer },
      { Server },
    ] = await Promise.all([
      import("@shared/infrastructure/container.ts"),
      import("@modules/auth/infrastructure/container.ts"),
      import("@shared/infrastructure/server.ts"),
    ]);

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
    mockJWTService.sign.mockResolvedValue("test-access-token");
    await postgres.prisma.session.deleteMany();
    await postgres.prisma.user.deleteMany();
  });

  afterAll(async () => {
    await postgres?.stop();
  }, 60_000);

  it("logs in an active verified user", async () => {
    await createUser({
      email: "active@example.com",
      password: "Password123!",
      failedLoginAttempts: 3,
    });

    const response = await request(app).post("/api/auth/login").send({
      email: "active@example.com",
      password: "Password123!",
    });
    const updatedUser = await postgres.prisma.user.findUniqueOrThrow({
      where: { email: "active@example.com" },
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "success",
      message: "User logged in successfully",
      data: {
        accessToken: "test-access-token",
      },
    });
    expect(mockJWTService.sign).toHaveBeenCalledWith(
      {
        sub: expect.any(String),
        email: "active@example.com",
        scope: "access",
      },
      "access",
      { expiresIn: "5m" }
    );
    expect(updatedUser.failedLoginAttempts).toBe(0);
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

  it("returns bad request without increasing failed attempts when the password fails schema validation", async () => {
    const user = await createUser({
      email: "invalid-password-schema@example.com",
      password: "Password123!",
    });

    const response = await request(app).post("/api/auth/login").send({
      email: "invalid-password-schema@example.com",
      password: "short",
    });
    const updatedUser = await postgres.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      status: "error",
      message: "the data provided is invalid",
      error: {
        code: "BAD_REQUEST",
        description: expect.stringContaining("Password"),
      },
    });
    expect(updatedUser.failedLoginAttempts).toBe(0);
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
