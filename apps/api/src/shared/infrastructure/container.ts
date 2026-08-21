import "reflect-metadata";

import { EmailService } from "@shared/infrastructure/services/email.ts";
import { Logger as LoggerImpl } from "@shared/infrastructure/services/logger.ts";
import { RedisService } from "@shared/infrastructure/services/redis.ts";
import { Container } from "inversify";
import type { Logger } from "./services/logger.ts";
import { PrismaService } from "./services/prisma.ts";
import { SecretManagerService } from "./services/secret-manager.ts";

const sharedContainer = new Container();

sharedContainer
  .bind<SecretManagerService>("SecretManagerService")
  .toConstantValue(SecretManagerService.getInstance());
sharedContainer
  .bind<Logger>("Logger")
  .toConstantValue(LoggerImpl.getInstance());
sharedContainer
  .bind<PrismaService>("PrismaService")
  .to(PrismaService)
  .inSingletonScope();
sharedContainer
  .bind<EmailService>("EmailService")
  .to(EmailService)
  .inSingletonScope();
sharedContainer
  .bind<RedisService>("RedisService")
  .to(RedisService)
  .inSingletonScope();

export const initializeSharedServices = async (): Promise<void> => {
  const prismaService = sharedContainer.get<PrismaService>("PrismaService");
  const emailService = sharedContainer.get<EmailService>("EmailService");
  const redisService = sharedContainer.get<RedisService>("RedisService");
  await prismaService.init();
  await emailService.initialize();
  await redisService.initialize();
};

export const shutdownSharedServices = async (): Promise<void> => {
  const redisService = sharedContainer.get<RedisService>("RedisService");
  await redisService.disconnect();
};

export default sharedContainer;
