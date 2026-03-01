import "reflect-metadata";
import { LoginUserUseCase } from "@modules/auth/application/login-usecase.ts";
import type { PasswordHasher } from "@modules/auth/domain/password-hasher.ts";
import type { AuthRepository } from "@modules/auth/domain/repository.ts";
import { ArgonPasswordHasher } from "@modules/auth/infrastructure/password-hasher-impl.ts";
import { AuthRepositoryImpl } from "@modules/auth/infrastructure/reporitory-impl.ts";
import { AuthController } from "@modules/auth/presentation/controller.ts";
import type { Logger } from "@shared/infrastructure/services/logger.ts";
import { Logger as LoggerImpl } from "@shared/infrastructure/services/logger.ts";
import { Container } from "inversify";

const container = new Container();

container.bind<Logger>("Logger").toConstantValue(LoggerImpl.getInstance());
container.bind<AuthController>("AuthController").to(AuthController);
container.bind<LoginUserUseCase>("LoginUserUseCase").to(LoginUserUseCase);
container.bind<AuthRepository>("AuthRepository").to(AuthRepositoryImpl);
container.bind<PasswordHasher>("PasswordHasher").to(ArgonPasswordHasher);

export default container;
