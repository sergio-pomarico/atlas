import "reflect-metadata";
import { AuthController } from "@modules/auth/presentation/controller.ts";
import type { Logger } from "@shared/infrastructure/services/logger.ts";
import { Logger as LoggerImpl } from "@shared/infrastructure/services/logger.ts";

import { Container } from "inversify";

const container = new Container();

container.bind<Logger>("Logger").toConstantValue(LoggerImpl.getInstance());
container.bind<AuthController>("AuthController").to(AuthController);

export default container;
