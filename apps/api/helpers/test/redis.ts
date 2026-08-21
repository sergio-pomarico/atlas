import { RedisService } from "@shared/infrastructure/services/redis.ts";
import type { SecretManagerService } from "@shared/infrastructure/services/secret-manager.ts";
import { GenericContainer, type StartedTestContainer } from "testcontainers";

export interface StartedRedisTestService {
  redisUrl: string;
  redisService: RedisService;
  stop(): Promise<void>;
}

export async function startRedisTestService(): Promise<StartedRedisTestService> {
  const container = await new GenericContainer("redis:8")
    .withExposedPorts(6379)
    .start();

  const redisUrl = `redis://${container.getHost()}:${container.getMappedPort(
    6379
  )}`;
  const secretManager = {
    getSecret: async () => ({ secretValue: redisUrl }),
  } as unknown as SecretManagerService;
  const redisService = new RedisService(secretManager);
  await redisService.initialize();

  return {
    redisUrl,
    redisService,
    stop: () => stopRedisTestService(redisService, container),
  };
}

async function stopRedisTestService(
  redisService: RedisService,
  container: StartedTestContainer
): Promise<void> {
  await redisService.disconnect();
  await container.stop();
}
