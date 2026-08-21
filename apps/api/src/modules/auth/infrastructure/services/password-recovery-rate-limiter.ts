import type {
  PasswordRecoveryRateLimiter,
  PasswordRecoveryRateLimitResult,
} from "@modules/auth/application/ports/password-recovery-rate-limiter.ts";
import type { RedisService } from "@shared/infrastructure/services/redis.ts";
import { inject, injectable } from "inversify";

const FORGOT_PASSWORD_IP_LIMIT = 20;
const FORGOT_PASSWORD_IP_TTL_SECONDS = 15 * 60;
const FORGOT_PASSWORD_EMAIL_TTL_SECONDS = 90;

const forgotPasswordRateLimitScript = `
local ipCount = tonumber(redis.call('GET', KEYS[1]))
if ipCount and ipCount >= tonumber(ARGV[1]) then
  return {0, redis.call('PTTL', KEYS[1]), redis.call('PTTL', KEYS[2])}
end

if ipCount then
  redis.call('INCR', KEYS[1])
else
  redis.call('SET', KEYS[1], '1', 'EX', ARGV[2])
end

local emailCreated = redis.call('SET', KEYS[2], '1', 'NX', 'EX', ARGV[3])
if emailCreated then
  return {1, 0, 0}
end

return {0, 0, redis.call('PTTL', KEYS[2])
`;

@injectable()
export class RedisPasswordRecoveryRateLimiter
  implements PasswordRecoveryRateLimiter
{
  private readonly redis: RedisService;

  constructor(@inject("RedisService") redis: RedisService) {
    this.redis = redis;
  }

  async consumeForgotPassword(
    email: string,
    ip: string
  ): Promise<PasswordRecoveryRateLimitResult> {
    const reply = await this.redis.evaluate(
      forgotPasswordRateLimitScript,
      [forgotPasswordIpKey(ip), forgotPasswordEmailKey(email)],
      [
        String(FORGOT_PASSWORD_IP_LIMIT),
        String(FORGOT_PASSWORD_IP_TTL_SECONDS),
        String(FORGOT_PASSWORD_EMAIL_TTL_SECONDS),
      ]
    );

    if (!Array.isArray(reply)) {
      throw new Error("Invalid password recovery rate limit response.");
    }

    const [allowed, ipTtlMilliseconds, emailTtlMilliseconds] =
      reply.map(Number);

    return {
      allowed: allowed === 1,
      blockingTtlMilliseconds: Math.max(
        0,
        ipTtlMilliseconds ?? 0,
        emailTtlMilliseconds ?? 0
      ),
    };
  }

  async clearResetPasswordEmailLimit(email: string): Promise<boolean> {
    return await this.redis.delete(resetPasswordEmailKey(email));
  }
}

function forgotPasswordIpKey(ip: string): string {
  return `auth:forgot-password:v1:ip:${ip}`;
}

function forgotPasswordEmailKey(email: string): string {
  return `auth:forgot-password:v1:email:${email}`;
}

function resetPasswordEmailKey(email: string): string {
  return `auth:reset-password:v1:email:${email}`;
}
