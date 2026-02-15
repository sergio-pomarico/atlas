import "reflect-metadata";
import type { Logger } from "@api/infrastructure/services/logger.ts";
import { Logger as LoggerImpl } from "@api/infrastructure/services/logger.ts";
import { AuthController } from "@api/modules/auth/presentation/controller.ts";

import { Container } from "inversify";

const container = new Container();

container.bind<Logger>("Logger").toConstantValue(LoggerImpl.getInstance());
container.bind<AuthController>("AuthController").to(AuthController);

export default container;
