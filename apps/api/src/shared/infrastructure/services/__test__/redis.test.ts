import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import {
  RedisService,
  RedisServiceError,
} from "@shared/infrastructure/services/redis.ts";
import { GenericContainer, type StartedTestContainer } from "testcontainers";

interface CachedUser {
  id: string;
  email: string;
  permissions: string[];
}

describe("RedisService integration", () => {
  let container: StartedTestContainer;
  let redisService: RedisService;

  beforeAll(async () => {
    container = await new GenericContainer("redis:8")
      .withExposedPorts(6379)
      .start();

    const redisUrl = `redis://${container.getHost()}:${container.getMappedPort(
      6379
    )}`;

    redisService = RedisService.getInstance(redisUrl);
    await redisService.connect();
  }, 60_000);

  afterAll(async () => {
    await redisService?.disconnect();
    await container?.stop();
  });

  it("stores and retrieves a string value", async () => {
    await redisService.set("redis-service:string", "active");

    await expect(redisService.get("redis-service:string")).resolves.toBe(
      "active"
    );
  });

  it("stores and retrieves number and boolean values as strings", async () => {
    await redisService.set("redis-service:number", 42);
    await redisService.set("redis-service:boolean", true);

    await expect(redisService.get("redis-service:number")).resolves.toBe("42");
    await expect(redisService.get("redis-service:boolean")).resolves.toBe(
      "true"
    );
  });

  it("stores and retrieves typed JSON values", async () => {
    const user: CachedUser = {
      id: "user-123",
      email: "user@example.com",
      permissions: ["users:read", "users:write"],
    };

    await redisService.setJson("redis-service:user", user);

    await expect(
      redisService.getJson<CachedUser>("redis-service:user")
    ).resolves.toEqual(user);
  });

  it("overwrites an existing key", async () => {
    await redisService.set("redis-service:overwrite", "first");
    await redisService.set("redis-service:overwrite", "second");

    await expect(redisService.get("redis-service:overwrite")).resolves.toBe(
      "second"
    );
  });

  it("deletes a single existing key", async () => {
    await redisService.set("redis-service:delete", "value");

    await expect(redisService.delete("redis-service:delete")).resolves.toBe(
      true
    );
    await expect(redisService.get("redis-service:delete")).resolves.toBeNull();
  });

  it("returns false when deleting a missing key", async () => {
    await expect(redisService.delete("redis-service:missing")).resolves.toBe(
      false
    );
  });

  it("throws a RedisServiceError when initialized with a different URL", () => {
    expect(() => RedisService.getInstance("redis://localhost:6380")).toThrow(
      RedisServiceError
    );
  });

  it("throws when reading a non JSON value as JSON", async () => {
    await redisService.set("redis-service:invalid-json", "not-json");

    await expect(
      redisService.getJson("redis-service:invalid-json")
    ).rejects.toBeInstanceOf(RedisServiceError);
    await expect(
      redisService.getJson("redis-service:invalid-json")
    ).rejects.toThrow(
      'Redis value for key "redis-service:invalid-json" is not valid JSON.'
    );
  });

  it(
    "expires keys using the provided TTL",
    async () => {
      await redisService.set("redis-service:ttl", "short-lived", 1);

      await expect(redisService.get("redis-service:ttl")).resolves.toBe(
        "short-lived"
      );

      await new Promise((resolve) => setTimeout(resolve, 2_000));

      await expect(redisService.get("redis-service:ttl")).resolves.toBeNull();
    },
    15_000
  );
});
