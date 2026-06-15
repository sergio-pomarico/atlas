import { RedisService } from "@shared/infrastructure/services/redis.ts";
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
    6379,
  )}`;
  const redisService = RedisService.getInstance(redisUrl);
  await redisService.connect();

  return {
    redisUrl,
    redisService,
    stop: () => stopRedisTestService(redisService, container),
  };
}

async function stopRedisTestService(
  redisService: RedisService,
  container: StartedTestContainer,
): Promise<void> {
  await redisService.disconnect();
  await container.stop();
}
