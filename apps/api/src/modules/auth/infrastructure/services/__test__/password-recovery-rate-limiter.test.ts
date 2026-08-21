import { describe, expect, it, jest } from "@jest/globals";
import { RedisPasswordRecoveryRateLimiter } from "@modules/auth/infrastructure/services/password-recovery-rate-limiter.ts";
import type { RedisService } from "@shared/infrastructure/services/redis.ts";

describe("RedisPasswordRecoveryRateLimiter", () => {
  it("uses endpoint-versioned keys and exposes the largest blocking TTL", async () => {
    const evaluate = jest
      .fn<
        (
          script: string,
          keys: string[],
          arguments_: string[]
        ) => Promise<unknown>
      >()
      .mockResolvedValue([0, 750, 1600]);
    const limiter = new RedisPasswordRecoveryRateLimiter({
      evaluate,
    } as unknown as RedisService);

    await expect(
      limiter.consumeForgotPassword("user@example.com", "::1")
    ).resolves.toEqual({ allowed: false, blockingTtlMilliseconds: 1600 });

    expect(evaluate).toHaveBeenCalledWith(
      expect.any(String),
      [
        "auth:forgot-password:v1:ip:::1",
        "auth:forgot-password:v1:email:user@example.com",
      ],
      ["20", "900", "90"]
    );
  });

  it("deletes only the endpoint-versioned reset email key", async () => {
    const deleteKey = jest
      .fn<(key: string) => Promise<boolean>>()
      .mockResolvedValue(true);
    const limiter = new RedisPasswordRecoveryRateLimiter({
      delete: deleteKey,
    } as unknown as RedisService);

    await expect(
      limiter.clearResetPasswordEmailLimit("user@example.com")
    ).resolves.toBe(true);

    expect(deleteKey).toHaveBeenCalledWith(
      "auth:reset-password:v1:email:user@example.com"
    );
  });
});
