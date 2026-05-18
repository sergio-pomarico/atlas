import { Logger } from "@shared/infrastructure/services/logger.ts";
import { SecretMangerService } from "@shared/infrastructure/services/secret-manager.ts";
import { Redis } from "@upstash/redis";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
}

export class RedisRateLimitService {
  private static instance: RedisRateLimitService;
  private readonly secretManager: SecretMangerService;
  private readonly logger: Logger;
  private client: Redis | null = null;

  private constructor() {
    this.secretManager = SecretMangerService.getInstance();
    this.logger = Logger.getInstance();
  }

  static getInstance(): RedisRateLimitService {
    if (!RedisRateLimitService.instance) {
      RedisRateLimitService.instance = new RedisRateLimitService();
    }
    return RedisRateLimitService.instance;
  }

  private async getClient(): Promise<Redis> {
    if (this.client) {
      return this.client;
    }

    const url = await this.secretManager.getSecret("UPSTASH_REDIS_REST_URL");
    const token = await this.secretManager.getSecret(
      "UPSTASH_REDIS_REST_TOKEN"
    );

    this.client = new Redis({
      url: url.secretValue,
      token: token.secretValue,
    });

    return this.client;
  }

  async checkAndIncrement(
    key: string,
    windowSeconds: number,
    maxRequests: number
  ): Promise<RateLimitResult> {
    const client = await this.getClient();
    const current = await client.incr(key);

    if (current === 1) {
      await client.expire(key, windowSeconds);
    }

    const ttl = await client.ttl(key);
    const resetSeconds = ttl > 0 ? ttl : windowSeconds;
    const remaining = Math.max(0, maxRequests - current);

    return {
      allowed: current <= maxRequests,
      remaining,
      resetSeconds,
    };
  }

  async reset(key: string): Promise<void> {
    try {
      const client = await this.getClient();
      await client.del(key);
    } catch (error) {
      this.logger.warn("Failed to reset rate limit key", { error, key });
    }
  }
}
