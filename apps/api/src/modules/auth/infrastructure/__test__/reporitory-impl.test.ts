import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { UserStatus } from "@atlas/entities/user.ts";
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
import { PrismaService } from "@shared/infrastructure/services/prisma.ts";
import {
  GenericContainer,
  type StartedTestContainer,
  Wait,
} from "testcontainers";

const execFileAsync = promisify(execFile);

async function runMigrations(databaseUrl: string): Promise<void> {
  await execFileAsync("pnpm", ["prisma", "migrate", "deploy"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
  });
}

describe("AuthRepositoryImpl integration", () => {
  let container: StartedTestContainer;
  let prismaService: PrismaService;
  let repository: AuthRepositoryImpl;

  beforeAll(async () => {
    container = await new GenericContainer("postgres:16-alpine")
      .withEnvironment({
        POSTGRES_DB: "atlas_test",
        POSTGRES_PASSWORD: "atlas",
        POSTGRES_USER: "atlas",
      })
      .withExposedPorts(5432)
      .withWaitStrategy(
        Wait.forLogMessage("database system is ready to accept connections")
      )
      .start();

    const databaseUrl = `postgresql://atlas:atlas@${container.getHost()}:${container.getMappedPort(
      5432
    )}/atlas_test`;

    await runMigrations(databaseUrl);

    prismaService = new PrismaService(async () => databaseUrl);
    await prismaService.ready();
    repository = new AuthRepositoryImpl(prismaService);
  }, 60_000);

  beforeEach(async () => {
    const prisma = prismaService.getClient();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prismaService?.getClient().$disconnect();
    await container?.stop();
  }, 60_000);

  it("finds a user by email", async () => {
    await prismaService.getClient().user.create({
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
    const user = await prismaService.getClient().user.create({
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
    const updatedUser = await prismaService.getClient().user.findUniqueOrThrow({
      where: { id: user.id },
    });

    expect(result.isSuccess).toBe(true);
    expect(updatedUser.failedLoginAttempts).toBe(2);
    expect(updatedUser.status).toBe(UserStatus.ACTIVE);
  });

  it("blocks the user when failed login attempts reaches the limit", async () => {
    const user = await prismaService.getClient().user.create({
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
    const updatedUser = await prismaService.getClient().user.findUniqueOrThrow({
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
});
