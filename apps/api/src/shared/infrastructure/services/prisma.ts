import { PrismaPg } from "@prisma/adapter-pg";
import type {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
} from "@prisma/client/runtime/client";
import { SecretMangerService } from "@shared/infrastructure/services/secret-manager.ts";
import { injectable } from "inversify";
import { PrismaClient } from "../../../../generated/prisma/client.ts";

export type PrismaError =
  | PrismaClientKnownRequestError
  | PrismaClientUnknownRequestError;

@injectable()
export class PrismaService {
  private static instance: PrismaService;
  private client: PrismaClient | null = null;

  private constructor() {
    this.initialize().catch((err) => {
      console.error("Error initializing PrismaService:", err);
      throw err;
    });
  }

  static getInstance(): PrismaService {
    if (!PrismaService.instance) {
      PrismaService.instance = new PrismaService();
    }
    return PrismaService.instance;
  }

  async initialize(): Promise<void> {
    const databaseUrl =
      await SecretMangerService.getInstance().getSecret("DATABASE_URL");
    const adapter = new PrismaPg({ connectionString: databaseUrl.secretValue });
    this.client = new PrismaClient({ adapter });
  }

  getClient(): PrismaClient {
    return this.client as PrismaClient;
  }
}
