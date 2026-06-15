import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { PrismaService } from "@shared/infrastructure/services/prisma.ts";
import type { SecretManagerService } from "@shared/infrastructure/services/secret-manager.ts";
import {
  GenericContainer,
  type StartedTestContainer,
  Wait,
} from "testcontainers";
import type { PrismaClient } from "../../generated/prisma/client.ts";

const execFileAsync = promisify(execFile);

export interface StartedPostgresTestDatabase {
  databaseUrl: string;
  prismaService: PrismaService;
  prisma: PrismaClient;
  stop(): Promise<void>;
}

export async function startPostgresTestDatabase(): Promise<StartedPostgresTestDatabase> {
  const container = await new GenericContainer("postgres:16-alpine")
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

  const secretManager = createDatabaseUrlSecretManager(databaseUrl);
  const prismaService = new PrismaService(secretManager);
  await prismaService.init();

  return {
    databaseUrl,
    prismaService,
    prisma: prismaService.getClient(),
    stop: () => stopPostgresTestDatabase(prismaService, container),
  };
}

async function runMigrations(databaseUrl: string): Promise<void> {
  await execFileAsync("pnpm", ["prisma", "migrate", "deploy"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
  });
}

function createDatabaseUrlSecretManager(
  databaseUrl: string
): SecretManagerService {
  return {
    getSecret(secretName: string) {
      if (secretName !== "DATABASE_URL") {
        return Promise.reject(
          new Error(`Unsupported test secret: ${secretName}`)
        );
      }
      return Promise.resolve({ secretValue: databaseUrl });
    },
  } as SecretManagerService;
}

async function stopPostgresTestDatabase(
  prismaService: PrismaService,
  container: StartedTestContainer
): Promise<void> {
  await prismaService.getClient().$disconnect();
  await container.stop();
}
