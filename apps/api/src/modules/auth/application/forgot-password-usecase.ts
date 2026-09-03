import type {
  PasswordRecoveryRateLimiter,
  PasswordRecoveryRateLimitResult,
} from "@modules/auth/application/ports/password-recovery-rate-limiter.ts";
import AuthenticationError from "@modules/auth/domain/error.ts";
import type { PasswordHasher } from "@modules/auth/domain/password-hasher.ts";
import type {
  ActivatePasswordResetRequestResult,
  CreatePendingPasswordResetRequestResult,
  PasswordRecoveryRepository,
} from "@modules/auth/domain/password-recovery-repository.ts";
import type { AuthRepository } from "@modules/auth/domain/repository.ts";
import type { User } from "@modules/auth/domain/user.ts";
import { generatePasswordRecoveryCode } from "@modules/auth/infrastructure/services/password-recovery-code-generator.ts";
import { ErrorCode } from "@shared/domain/errors/code.ts";
import { Result } from "@shared/domain/result.ts";
import type {
  EmailDeliveryResult,
  EmailService,
} from "@shared/infrastructure/services/email.ts";
import type { Logger } from "@shared/infrastructure/services/logger.ts";
import { parseHTMLTemplate } from "@shared/utils/email-templates.ts";
import { tryCatch } from "@shared/utils/try-catch.ts";
import { inject, injectable } from "inversify";

export interface ForgotPasswordInput {
  email: string;
  ip: string;
}

export type ForgotPasswordResult = Record<never, never>;

@injectable()
export class ForgotPasswordUseCase {
  private readonly repository: AuthRepository;
  private readonly passwordRecoveryRepository: PasswordRecoveryRepository;
  private readonly passwordHasher: PasswordHasher;
  private readonly emailService: EmailService;
  private readonly rateLimiter: PasswordRecoveryRateLimiter;
  private readonly logger: Logger;

  constructor(
    @inject("AuthRepository") repository: AuthRepository,
    @inject("PasswordRecoveryRepository")
    passwordRecoveryRepository: PasswordRecoveryRepository,
    @inject("PasswordHasher") passwordHasher: PasswordHasher,
    @inject("EmailService") emailService: EmailService,
    @inject("PasswordRecoveryRateLimiter")
    rateLimiter: PasswordRecoveryRateLimiter,
    @inject("Logger") logger: Logger
  ) {
    this.repository = repository;
    this.passwordRecoveryRepository = passwordRecoveryRepository;
    this.passwordHasher = passwordHasher;
    this.emailService = emailService;
    this.rateLimiter = rateLimiter;
    this.logger = logger;
  }

  run = async (
    dto: ForgotPasswordInput
  ): Promise<Result<ForgotPasswordResult, AuthenticationError>> => {
    const limitResult = await tryCatch<PasswordRecoveryRateLimitResult>(
      this.rateLimiter.consumeForgotPassword(dto.email, dto.ip)
    );
    if (!limitResult.isSuccess) {
      this.logger.error("Forgot password rate limiter failed");
      return Result.fail(AuthenticationError.passwordRecoveryUnavailable());
    }
    const limit = limitResult.getData();
    if (!limit.allowed) {
      return Result.fail(
        AuthenticationError.passwordRecoveryRateLimited(
          limit.blockingTtlMilliseconds
        )
      );
    }

    const clearLimitResult = await tryCatch(
      this.rateLimiter.clearResetPasswordEmailLimit(dto.email)
    );
    if (!clearLimitResult.isSuccess) {
      this.logger.error("Forgot password reset limit cleanup failed");
      return Result.fail(AuthenticationError.passwordRecoveryUnavailable());
    }

    const userLookupResult = await tryCatch<Result<User, AuthenticationError>>(
      this.repository.findByEmail(dto.email)
    );
    if (!userLookupResult.isSuccess) {
      this.logger.error("Forgot password eligibility lookup failed");
      return Result.fail(
        AuthenticationError.internalServerError(
          "Password recovery lookup failed",
          "The password recovery service is temporarily unavailable"
        )
      );
    }
    const userResult = userLookupResult.getData();
    const user = userResult.isSuccess ? userResult.getData() : null;

    if (!userResult.isSuccess) {
      if (userResult.getError().error.code === ErrorCode.NOT_FOUND) {
        return Result.success({});
      }
      return Result.fail(userResult.getError());
    }
    if (!user?.isEligibleForPasswordRecovery()) {
      return Result.success({});
    }

    const code = generatePasswordRecoveryCode();
    const codeHashResult = await tryCatch<string>(
      this.passwordHasher.hash(code)
    );
    if (!codeHashResult.isSuccess) {
      this.logger.error("Forgot password code hashing failed");
      return Result.success({});
    }
    const codeHash = codeHashResult.getData();

    const pendingRequestResult =
      await tryCatch<CreatePendingPasswordResetRequestResult>(
        this.passwordRecoveryRepository.createPendingRequest(
          dto.email,
          codeHash,
          new Date()
        )
      );
    if (!pendingRequestResult.isSuccess) {
      this.logger.error("Forgot password pending persistence failed");
      return Result.success({});
    }
    const created = pendingRequestResult.getData();
    if (created.type !== "created") {
      if (created.type === "infrastructureError") {
        this.logger.error("Forgot password pending persistence failed");
      }
      return Result.success({});
    }

    const templateResult = await tryCatch<string>(
      parseHTMLTemplate(
        "../../modules/auth/presentation/templates/forgot.html",
        { code }
      )
    );
    if (!templateResult.isSuccess) {
      this.logger.error("Forgot password email template rendering failed");
      await this.invalidatePendingRequest(created.requestId);
      return Result.success({});
    }
    const htmlBody = templateResult.getData();

    const deliveryResult = await tryCatch<EmailDeliveryResult>(
      this.emailService.sendWithResult({
        to: dto.email,
        subject: "Codigo para restablecer tu contrasena",
        htmlBody,
      })
    );
    if (!deliveryResult.isSuccess) {
      this.logger.error("Forgot password email delivery failed");
      await this.invalidatePendingRequest(created.requestId);
      return Result.success({});
    }
    if (!deliveryResult.getData().accepted) {
      this.logger.error("Forgot password email delivery was not accepted");
      await this.invalidatePendingRequest(created.requestId);
      return Result.success({});
    }

    const activationResult = await tryCatch<ActivatePasswordResetRequestResult>(
      this.passwordRecoveryRepository.activatePendingRequest(
        created.requestId,
        new Date()
      )
    );
    if (!activationResult.isSuccess) {
      this.logger.error("Forgot password pending activation failed");
      await this.invalidatePendingRequest(created.requestId);
      return Result.success({});
    }
    const activated = activationResult.getData();
    if (activated.type !== "activated") {
      this.logger.error("Forgot password pending activation failed");
      await this.invalidatePendingRequest(created.requestId);
    }
    return Result.success({});
  };

  private async invalidatePendingRequest(requestId: string): Promise<void> {
    const invalidationResult = await tryCatch(
      this.passwordRecoveryRepository.invalidatePendingRequest(
        requestId,
        new Date()
      )
    );
    if (
      invalidationResult.isSuccess &&
      invalidationResult.getData().type === "invalidated"
    ) {
      return;
    }
    this.logger.error("Forgot password pending invalidation failed");
  }
}
