import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClientInitializationError,
  type PrismaClientKnownRequestError,
  type PrismaClientUnknownRequestError,
} from "@prisma/client/runtime/client";
import { inject, injectable } from "inversify";
import { Prisma, PrismaClient } from "../../../../generated/prisma/client.ts";
import type { SecretManagerService } from "./secret-manager.ts";

export type PrismaError =
  | PrismaClientKnownRequestError
  | PrismaClientUnknownRequestError;

@injectable()
export class PrismaService {
  private client: PrismaClient | null = null;
  private readonly secretManager: SecretManagerService;

  constructor(
    @inject("SecretManagerService")
    secretManager: SecretManagerService
  ) {
    this.secretManager = secretManager;
  }

  async init(): Promise<void> {
    const databaseUrl = await this.secretManager.getSecret("DATABASE_URL");
    const adapter = new PrismaPg({ connectionString: databaseUrl.secretValue });
    this.client = new PrismaClient({ adapter });
  }

  getClient(): PrismaClient {
    console.log("Getting Prisma client.", this.client);
    if (!this.client) {
      throw new PrismaClientInitializationError(
        "PrismaService has not been initialized.",
        Prisma.prismaVersion.client
      );
    }
    return this.client;
  }
}
