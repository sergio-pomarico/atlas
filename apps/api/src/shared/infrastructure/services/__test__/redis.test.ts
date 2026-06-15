import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import {
  startRedisTestService,
  type StartedRedisTestService,
} from "@helpers/test/redis.ts";
import {
  RedisService,
  RedisServiceError,
} from "@shared/infrastructure/services/redis.ts";

interface CachedUser {
  id: string;
  email: string;
  permissions: string[];
}

describe("RedisService integration", () => {
  let redis: StartedRedisTestService;

  beforeAll(async () => {
    redis = await startRedisTestService();
  }, 60_000);

  afterAll(async () => {
    await redis?.stop();
  }, 60_000);

  it("stores and retrieves a string value", async () => {
    await redis.redisService.set("redis-service:string", "active");
    await expect(redis.redisService.get("redis-service:string")).resolves.toBe(
      "active",
    );
  });

  it("stores and retrieves number and boolean values as strings", async () => {
    await redis.redisService.set("redis-service:number", 42);
    await redis.redisService.set("redis-service:boolean", true);
    await expect(redis.redisService.get("redis-service:number")).resolves.toBe(
      "42",
    );
    await expect(redis.redisService.get("redis-service:boolean")).resolves.toBe(
      "true",
    );
  });

  it("stores and retrieves typed JSON values", async () => {
    const user: CachedUser = {
      id: "user-123",
      email: "user@example.com",
      permissions: ["users:read", "users:write"],
    };

    await redis.redisService.setJson("redis-service:user", user);
    await expect(
      redis.redisService.getJson<CachedUser>("redis-service:user"),
    ).resolves.toEqual(user);
  });

  it("overwrites an existing key", async () => {
    await redis.redisService.set("redis-service:overwrite", "first");
    await redis.redisService.set("redis-service:overwrite", "second");
    await expect(
      redis.redisService.get("redis-service:overwrite"),
    ).resolves.toBe("second");
  });

  it("deletes a single existing key", async () => {
    await redis.redisService.set("redis-service:delete", "value");
    await expect(
      redis.redisService.delete("redis-service:delete"),
    ).resolves.toBe(true);
    await expect(
      redis.redisService.get("redis-service:delete"),
    ).resolves.toBeNull();
  });

  it("returns false when deleting a missing key", async () => {
    await expect(
      redis.redisService.delete("redis-service:missing"),
    ).resolves.toBe(false);
  });

  it("throws a RedisServiceError when initialized with a different URL", () => {
    expect(() => RedisService.getInstance("redis://localhost:6380")).toThrow(
      RedisServiceError,
    );
  });

  it("throws when reading a non JSON value as JSON", async () => {
    await redis.redisService.set("redis-service:invalid-json", "not-json");
    await expect(
      redis.redisService.getJson("redis-service:invalid-json"),
    ).rejects.toBeInstanceOf(RedisServiceError);
    await expect(
      redis.redisService.getJson("redis-service:invalid-json"),
    ).rejects.toThrow(
      'Redis value for key "redis-service:invalid-json" is not valid JSON.',
    );
  });

  it("expires keys using the provided TTL", async () => {
    await redis.redisService.set("redis-service:ttl", "short-lived", 1);
    await expect(redis.redisService.get("redis-service:ttl")).resolves.toBe(
      "short-lived",
    );
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await expect(
      redis.redisService.get("redis-service:ttl"),
    ).resolves.toBeNull();
  }, 15_000);
});
