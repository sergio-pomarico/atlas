import { inject, injectable } from "inversify";
import { createClient, type RedisClientType } from "redis";
import type { SecretManagerService } from "./secret-manager.ts";

type RedisValue = string | boolean | number;

const DEFAULT_TTL_SECONDS = 15 * 60;

export class RedisServiceError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "RedisServiceError";
  }
}

@injectable()
export class RedisService {
  private client: RedisClientType | null = null;
  private readonly secretManager: SecretManagerService;

  constructor(
    @inject("SecretManagerService") secretManager: SecretManagerService
  ) {
    this.secretManager = secretManager;
  }

  async initialize(): Promise<void> {
    if (this.client) {
      return;
    }

    const redisUrl = await this.secretManager.getSecret("UPSTASH_REDIS_URL");
    this.client = createClient({ url: redisUrl.secretValue });
    await this.connect();
  }

  async connect(): Promise<void> {
    const client = this.getClient();

    if (client.isOpen) {
      return;
    }
    await client.connect();
  }

  async set(
    key: string,
    value: RedisValue,
    ttlSeconds = DEFAULT_TTL_SECONDS
  ): Promise<void> {
    await this.getClient().set(key, String(value), { EX: ttlSeconds });
  }

  async get(key: string): Promise<string | null> {
    return await this.getClient().get(key);
  }

  async setJson<T extends object>(
    key: string,
    value: T,
    ttlSeconds = DEFAULT_TTL_SECONDS
  ): Promise<void> {
    await this.getClient().set(key, JSON.stringify(value), { EX: ttlSeconds });
  }

  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.get(key);

    if (value === null) {
      return null;
    }
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      throw new RedisServiceError(
        `Redis value for key "${key}" is not valid JSON.`,
        { cause: error }
      );
    }
  }

  async delete(key: string): Promise<boolean> {
    const deletedKeys = await this.getClient().del(key);
    return deletedKeys === 1;
  }

  async evaluate(
    script: string,
    keys: string[],
    arguments_: string[]
  ): Promise<unknown> {
    return await this.getClient().eval(script, {
      keys,
      arguments: arguments_,
    });
  }

  async disconnect(): Promise<void> {
    if (!this.client?.isOpen) {
      return;
    }

    await this.client.quit();
  }

  private getClient(): RedisClientType {
    if (!this.client) {
      throw new RedisServiceError(
        "RedisService has not been initialized. Call initialize() before use."
      );
    }

    return this.client;
  }
}
