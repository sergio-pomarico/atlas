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
import { AuthRepositoryImpl } from "@modules/auth/infrastructure/reporitory-impl.ts";

describe("AuthRepositoryImpl integration", () => {
  let postgres: StartedPostgresTestDatabase;
  let repository: AuthRepositoryImpl;

  beforeAll(async () => {
    postgres = await startPostgresTestDatabase();
    repository = new AuthRepositoryImpl(postgres.prismaService);
  }, 60_000);

  beforeEach(async () => {
    await postgres.prisma.session.deleteMany();
    await postgres.prisma.user.deleteMany();
  });

  afterAll(async () => {
    await postgres?.stop();
  }, 60_000);

  it("finds a user by email", async () => {
    await postgres.prisma.user.create({
      data: {
        email: "active@example.com",
        failedLoginAttempts: 0,
        password: "hashed-password",
        phone: "3011234567",
        status: UserStatus.ACTIVE,
        verified: true,
      },
    });

    const result = await repository.findByEmail("active@example.com");

    expect(result.isSuccess).toBe(true);
    expect(result.getData().email).toBe("active@example.com");
    expect(result.getData().isVerified()).toBe(true);
  });

  it("returns an authentication error when email does not exist", async () => {
    const result = await repository.findByEmail("missing@example.com");

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBeInstanceOf(AuthenticationError);
  });

  it("increases failed login attempts for an existing user", async () => {
    const user = await postgres.prisma.user.create({
      data: {
        email: "attempts@example.com",
        failedLoginAttempts: 1,
        password: "hashed-password",
        phone: "3017654321",
        status: UserStatus.ACTIVE,
        verified: true,
      },
    });

    const result = await repository.increaseFailedLoginAttempts(user.id);
    const updatedUser = await postgres.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });

    expect(result.isSuccess).toBe(true);
    expect(updatedUser.failedLoginAttempts).toBe(2);
    expect(updatedUser.status).toBe(UserStatus.ACTIVE);
  });

  it("blocks the user when failed login attempts reaches the limit", async () => {
    const user = await postgres.prisma.user.create({
      data: {
        email: "blocked@example.com",
        failedLoginAttempts: 4,
        password: "hashed-password",
        phone: "3010000000",
        status: UserStatus.ACTIVE,
        verified: true,
      },
    });

    const result = await repository.increaseFailedLoginAttempts(user.id);
    const updatedUser = await postgres.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });

    expect(result.isSuccess).toBe(true);
    expect(updatedUser.failedLoginAttempts).toBe(5);
    expect(updatedUser.status).toBe(UserStatus.BLOCKED);
  });

  it("returns an authentication error when increasing attempts for a missing user", async () => {
    const result =
      await repository.increaseFailedLoginAttempts("missing-user-id");

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBeInstanceOf(AuthenticationError);
  });

  it("resets failed login attempts for an existing user", async () => {
    const user = await postgres.prisma.user.create({
      data: {
        email: "reset@example.com",
        failedLoginAttempts: 3,
        password: "hashed-password",
        phone: "3011111111",
        status: UserStatus.ACTIVE,
        verified: true,
      },
    });

    const result = await repository.resetFailedLoginAttempts(user.id);
    const updatedUser = await postgres.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });

    expect(result.isSuccess).toBe(true);
    expect(updatedUser.failedLoginAttempts).toBe(0);
    expect(updatedUser.status).toBe(UserStatus.ACTIVE);
  });

  it("returns an authentication error when resetting attempts for a missing user", async () => {
    const result = await repository.resetFailedLoginAttempts("missing-user-id");

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBeInstanceOf(AuthenticationError);
  });
});
