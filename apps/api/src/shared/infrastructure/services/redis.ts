import { createClient, type RedisClientType } from "redis";

type RedisValue = string | boolean | number;

const DEFAULT_TTL_SECONDS = 15 * 60;

export class RedisServiceError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "RedisServiceError";
  }
}

export class RedisService {
  private static instance: RedisService;
  private readonly client: RedisClientType;
  private readonly url: string;

  private constructor(url: string) {
    this.url = url;
    this.client = createClient({ url });
  }

  static getInstance(url: string): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService(url);
    }

    if (RedisService.instance.url !== url) {
      throw new RedisServiceError(
        "RedisService already initialized with a different URL."
      );
    }

    return RedisService.instance;
  }

  async connect(): Promise<void> {
    if (this.client.isOpen) {
      return;
    }
    await this.client.connect();
  }

  async set(
    key: string,
    value: RedisValue,
    ttlSeconds = DEFAULT_TTL_SECONDS
  ): Promise<void> {
    await this.client.set(key, String(value), { EX: ttlSeconds });
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  async setJson<T extends object>(
    key: string,
    value: T,
    ttlSeconds = DEFAULT_TTL_SECONDS
  ): Promise<void> {
    await this.client.set(key, JSON.stringify(value), { EX: ttlSeconds });
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
    const deletedKeys = await this.client.del(key);
    return deletedKeys === 1;
  }

  async disconnect(): Promise<void> {
    if (!this.client.isOpen) {
      return;
    }

    await this.client.quit();
  }
}
