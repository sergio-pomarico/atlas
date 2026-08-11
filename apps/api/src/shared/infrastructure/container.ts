import "reflect-metadata";

import { EmailService } from "@shared/infrastructure/services/email.ts";
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
sharedContainer
  .bind<EmailService>("EmailService")
  .to(EmailService)
  .inSingletonScope();

export const initializeSharedServices = async (): Promise<void> => {
  const prismaService = sharedContainer.get<PrismaService>("PrismaService");
  const emailService = sharedContainer.get<EmailService>("EmailService");
  await prismaService.init();
  await emailService.initialize();
};

export default sharedContainer;
