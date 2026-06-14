import "reflect-metadata";

import { Logger as LoggerImpl } from "@shared/infrastructure/services/logger.ts";
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

export const initializeSharedServices = async (): Promise<void> => {
  const prismaService = sharedContainer.get<PrismaService>("PrismaService");
  await prismaService.init();
};

export default sharedContainer;
