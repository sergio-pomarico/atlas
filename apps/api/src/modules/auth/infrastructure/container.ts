import "reflect-metadata";
import { ForgotPasswordUseCase } from "@modules/auth/application/forgot-password-usecase.ts";
import { LoginUserUseCase } from "@modules/auth/application/login-usecase.ts";
import type { PasswordRecoveryRateLimiter } from "@modules/auth/application/ports/password-recovery-rate-limiter.ts";
import type { PasswordHasher } from "@modules/auth/domain/password-hasher.ts";
import type { PasswordRecoveryRepository } from "@modules/auth/domain/password-recovery-repository.ts";
import type { AuthRepository } from "@modules/auth/domain/repository.ts";
import { ArgonPasswordHasher } from "@modules/auth/infrastructure/password-hasher-impl.ts";
import { PrismaPasswordRecoveryRepository } from "@modules/auth/infrastructure/password-recovery-repository-impl.ts";
import { AuthRepositoryImpl } from "@modules/auth/infrastructure/reporitory-impl.ts";
import { RedisPasswordRecoveryRateLimiter } from "@modules/auth/infrastructure/services/password-recovery-rate-limiter.ts";
import { AuthController } from "@modules/auth/presentation/controller.ts";
import sharedContainer from "@shared/infrastructure/container.ts";
import { JWTService } from "@shared/infrastructure/services/jwt.ts";
import { Container } from "inversify";

const authContainer = new Container({ parent: sharedContainer });

authContainer.bind<AuthController>("AuthController").to(AuthController);
authContainer.bind<LoginUserUseCase>("LoginUserUseCase").to(LoginUserUseCase);
authContainer
  .bind<ForgotPasswordUseCase>("ForgotPasswordUseCase")
  .to(ForgotPasswordUseCase);
authContainer.bind<AuthRepository>("AuthRepository").to(AuthRepositoryImpl);
authContainer
  .bind<PasswordRecoveryRepository>("PasswordRecoveryRepository")
  .to(PrismaPasswordRecoveryRepository);
authContainer.bind<PasswordHasher>("PasswordHasher").to(ArgonPasswordHasher);
authContainer
  .bind<PasswordRecoveryRateLimiter>("PasswordRecoveryRateLimiter")
  .to(RedisPasswordRecoveryRateLimiter)
  .inSingletonScope();
authContainer
  .bind<JWTService>("JWTService")
  .toConstantValue(JWTService.getInstance());

export default authContainer;
