import "reflect-metadata";
import { LoginUserUseCase } from "@modules/auth/application/login-usecase.ts";
import type { PasswordHasher } from "@modules/auth/domain/password-hasher.ts";
import type { AuthRepository } from "@modules/auth/domain/repository.ts";
import { ArgonPasswordHasher } from "@modules/auth/infrastructure/password-hasher-impl.ts";
import { AuthRepositoryImpl } from "@modules/auth/infrastructure/reporitory-impl.ts";
import { AuthController } from "@modules/auth/presentation/controller.ts";
import sharedContainer from "@shared/infrastructure/container.ts";
import { JWTService } from "@shared/infrastructure/services/jwt.ts";
import { Container } from "inversify";

const authContainer = new Container({ parent: sharedContainer });

authContainer.bind<AuthController>("AuthController").to(AuthController);
authContainer.bind<LoginUserUseCase>("LoginUserUseCase").to(LoginUserUseCase);
authContainer.bind<AuthRepository>("AuthRepository").to(AuthRepositoryImpl);
authContainer.bind<PasswordHasher>("PasswordHasher").to(ArgonPasswordHasher);
authContainer
  .bind<JWTService>("JWTService")
  .toConstantValue(JWTService.getInstance());

export default authContainer;
