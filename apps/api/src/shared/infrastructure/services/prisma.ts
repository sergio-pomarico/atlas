import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClientInitializationError,
  type PrismaClientKnownRequestError,
  type PrismaClientUnknownRequestError,
} from "@prisma/client/runtime/client";
import { injectable } from "inversify";
import { Prisma, PrismaClient } from "../../../../generated/prisma/client.ts";

export type PrismaError =
  | PrismaClientKnownRequestError
  | PrismaClientUnknownRequestError;

export type DatabaseUrlProvider = () => Promise<string>;

@injectable()
export class PrismaService {
  private static instance: PrismaService;
  private client: PrismaClient | null = null;
  private readonly initialization: Promise<void>;
  private readonly getDatabaseUrl: DatabaseUrlProvider;

  constructor(getDatabaseUrl: DatabaseUrlProvider) {
    this.getDatabaseUrl = getDatabaseUrl;
    this.initialization = this.initialize().catch((err) => {
      console.error("Error initializing PrismaService:", err);
      throw err;
    });
  }

  static getInstance(getDatabaseUrl: DatabaseUrlProvider): PrismaService {
    if (!PrismaService.instance) {
      PrismaService.instance = new PrismaService(getDatabaseUrl);
    }
    return PrismaService.instance;
  }

  async initialize(): Promise<void> {
    const databaseUrl = await this.getDatabaseUrl();
    const adapter = new PrismaPg({ connectionString: databaseUrl });
    this.client = new PrismaClient({ adapter });
  }

  getClient(): PrismaClient {
    if (!this.client) {
      throw new PrismaClientInitializationError(
        "PrismaService has not been initialized. Call ready() before getClient().",
        Prisma.prismaVersion.client
      );
    }

    return this.client;
  }

  async ready(): Promise<void> {
    await this.initialization;
  }
}
