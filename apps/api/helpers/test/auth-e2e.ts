import { UserStatus } from "@atlas/entities/user.ts";
import { jest } from "@jest/globals";
import { ArgonPasswordHasher } from "@modules/auth/infrastructure/password-hasher-impl.ts";
import type { JWTService } from "@shared/infrastructure/services/jwt.ts";
import type { Application } from "express";
import {
  type StartedPostgresTestDatabase,
  startPostgresTestDatabase,
} from "./postgres.ts";

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

export const mockJWTService = {
  sign: jest.fn<JWTService["sign"]>(),
  verify: jest.fn<JWTService["verify"]>(),
};

type UserStatusValue = (typeof UserStatus)[keyof typeof UserStatus];

export interface CreateTestUserInput {
  email: string;
  password: string;
  status?: UserStatusValue;
  verified?: boolean;
  failedLoginAttempts?: number;
}

export interface AuthE2EContext {
  app: Application;
  postgres: StartedPostgresTestDatabase;
  mockJWTService: typeof mockJWTService;
  createUser(input: CreateTestUserInput): ReturnType<CreateTestUser>;
  reset(): Promise<void>;
  stop(): Promise<void>;
}

type CreateTestUser = ReturnType<typeof createTestUserFactory>;
type SigningPayload = Parameters<JWTService["sign"]>[0];

const accessTokens = new Map<string, { sub: string; sid: string }>();
const refreshTokens = new Map<
  string,
  { sub: string; sid: string; exp: number }
>();
let accessTokenSequence = 0;

function signTestToken(payload: SigningPayload): Promise<string | null> {
  if (!("sid" in payload)) {
    return Promise.resolve(null);
  }
  if (payload.scope === "refresh" && "exp" in payload) {
    const token = `test-refresh-token-${payload.sid}`;
    refreshTokens.set(token, {
      sub: payload.sub,
      sid: payload.sid,
      exp: payload.exp,
    });
    return Promise.resolve(token);
  }
  if (payload.scope !== "access") {
    return Promise.resolve(null);
  }
  accessTokenSequence += 1;
  const token = `test-access-token-${payload.sid}-${accessTokenSequence}`;
  accessTokens.set(token, { sub: payload.sub, sid: payload.sid });
  return Promise.resolve(token);
}

function verifyTestToken(token: string): Promise<unknown | null> {
  const accessClaims = accessTokens.get(token);
  if (accessClaims) {
    return Promise.resolve({
      ...accessClaims,
      scope: "access" as const,
      iat: 1,
      exp: 2,
      iss: "atlas-api" as const,
      aud: "atlas-client" as const,
    });
  }
  const refreshClaims = refreshTokens.get(token);
  return Promise.resolve(
    refreshClaims
      ? {
          ...refreshClaims,
          scope: "refresh" as const,
          iat: 1,
          iss: "atlas-api" as const,
          aud: "atlas-client" as const,
        }
      : null
  );
}

function resetTestTokens(): void {
  accessTokens.clear();
  refreshTokens.clear();
  accessTokenSequence = 0;
  mockJWTService.sign.mockReset();
  mockJWTService.verify.mockReset();
  mockJWTService.sign.mockImplementation(signTestToken);
  mockJWTService.verify.mockImplementation(verifyTestToken);
}

function createTestUserFactory(
  postgres: StartedPostgresTestDatabase,
  passwordHasher: ArgonPasswordHasher
) {
  return async ({
    email,
    password,
    status = UserStatus.ACTIVE,
    verified = true,
    failedLoginAttempts = 0,
  }: CreateTestUserInput) =>
    postgres.prisma.user.create({
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

export async function startAuthE2EContext(): Promise<AuthE2EContext> {
  const { default: sharedContainer } = await import(
    "@shared/infrastructure/container.ts"
  );
  const { default: authContainer } = await import(
    "@modules/auth/infrastructure/container.ts"
  );
  const { Server } = await import("@shared/infrastructure/server.ts");
  const postgres = await startPostgresTestDatabase();

  sharedContainer
    .rebindSync("PrismaService")
    .toConstantValue(postgres.prismaService);
  authContainer
    .rebindSync<JWTService>("JWTService")
    .toConstantValue(mockJWTService as unknown as JWTService);

  const app = new Server(0).app;
  const createUser = createTestUserFactory(postgres, new ArgonPasswordHasher());

  return {
    app,
    postgres,
    mockJWTService,
    createUser,
    async reset() {
      jest.clearAllMocks();
      resetTestTokens();
      await postgres.prisma.session.deleteMany();
      await postgres.prisma.user.deleteMany();
    },
    async stop() {
      await postgres.stop();
    },
  };
}

function phoneFromEmail(email: string): string {
  const digits = email.replace(/\D/g, "").padEnd(10, "0");
  return digits.slice(0, 10);
}
