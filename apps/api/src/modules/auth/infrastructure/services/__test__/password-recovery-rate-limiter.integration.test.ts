import {
  type StartedRedisTestService,
  startRedisTestService,
} from "@helpers/test/redis.ts";
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { RedisPasswordRecoveryRateLimiter } from "@modules/auth/infrastructure/services/password-recovery-rate-limiter.ts";

describe("RedisPasswordRecoveryRateLimiter integration", () => {
  let redis: StartedRedisTestService;
  let limiter: RedisPasswordRecoveryRateLimiter;

  beforeAll(async () => {
    redis = await startRedisTestService();
    limiter = new RedisPasswordRecoveryRateLimiter(redis.redisService);
  }, 60_000);

  afterAll(async () => {
    await redis?.stop();
  }, 60_000);

  it("keeps the email cooldown TTL fixed when a request is retried", async () => {
    const email = "fixed-ttl@example.com";

    await expect(
      limiter.consumeForgotPassword(email, "127.0.0.1")
    ).resolves.toEqual({ allowed: true, blockingTtlMilliseconds: 0 });

    await new Promise((resolve) => setTimeout(resolve, 1100));

    const retry = await limiter.consumeForgotPassword(email, "127.0.0.1");

    expect(retry).toEqual({
      allowed: false,
      blockingTtlMilliseconds: expect.any(Number),
    });
    expect(retry.blockingTtlMilliseconds).toBeLessThan(89_000);
  }, 15_000);

  it("does not create an email cooldown when the IP is already blocked", async () => {
    const blockedIp = "127.0.0.2";
    const email = "not-created@example.com";

    await redis.redisService.set("auth:forgot-password:v1:ip:127.0.0.2", 20);

    await expect(
      limiter.consumeForgotPassword(email, blockedIp)
    ).resolves.toEqual({
      allowed: false,
      blockingTtlMilliseconds: expect.any(Number),
    });

    await expect(
      limiter.consumeForgotPassword(email, "127.0.0.3")
    ).resolves.toEqual({ allowed: true, blockingTtlMilliseconds: 0 });
  });

  it("returns the largest TTL when IP and email are blocked", async () => {
    const email = "both-blocked@example.com";
    const ip = "127.0.0.4";

    await redis.redisService.set(`auth:forgot-password:v1:ip:${ip}`, 20, 1);
    await redis.redisService.set(
      `auth:forgot-password:v1:email:${email}`,
      1,
      5
    );

    const result = await limiter.consumeForgotPassword(email, ip);

    expect(result).toEqual({
      allowed: false,
      blockingTtlMilliseconds: expect.any(Number),
    });
    expect(result.blockingTtlMilliseconds).toBeGreaterThan(3000);
  });

  it("deletes only the reset-password counter for an email", async () => {
    const email = "clear-reset@example.com";
    const resetKey = `auth:reset-password:v1:email:${email}`;
    const forgotKey = `auth:forgot-password:v1:email:${email}`;

    await redis.redisService.set(resetKey, "1");
    await redis.redisService.set(forgotKey, "1");

    await expect(limiter.clearResetPasswordEmailLimit(email)).resolves.toBe(
      true
    );
    await expect(redis.redisService.get(resetKey)).resolves.toBeNull();
    await expect(redis.redisService.get(forgotKey)).resolves.toBe("1");
  });
});
