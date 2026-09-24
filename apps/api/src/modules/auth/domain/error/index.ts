import { authenticationErrorCatalog } from "@modules/auth/domain/error/authentication-error-catalog.ts";
import AppError from "@shared/domain/errors/app.ts";

type AuthenticationErrorDefinition =
  (typeof authenticationErrorCatalog)[keyof typeof authenticationErrorCatalog];

export default class AuthenticationError extends AppError {
  private constructor(definition: AuthenticationErrorDefinition) {
    super(
      definition.message,
      definition.description,
      definition.code,
      definition.status,
      definition.statusCode
    );
    Error.captureStackTrace(this, AuthenticationError);
  }

  private static fromDefinition(
    definition: AuthenticationErrorDefinition
  ): AuthenticationError {
    return new AuthenticationError(definition);
  }

  static emailNotFound(): AuthenticationError {
    return AuthenticationError.fromDefinition(
      authenticationErrorCatalog.emailNotFound
    );
  }

  static userNotFound(): AuthenticationError {
    return AuthenticationError.fromDefinition(
      authenticationErrorCatalog.userNotFound
    );
  }

  static invalidCredentials(): AuthenticationError {
    return AuthenticationError.fromDefinition(
      authenticationErrorCatalog.invalidCredentials
    );
  }

  static userNotVerifiedOrBlocked(): AuthenticationError {
    return AuthenticationError.fromDefinition(
      authenticationErrorCatalog.userNotVerifiedOrBlocked
    );
  }

  static sessionUserNotEligible(): AuthenticationError {
    return AuthenticationError.fromDefinition(
      authenticationErrorCatalog.sessionUserNotEligible
    );
  }

  static passwordValidationFailed(): AuthenticationError {
    return AuthenticationError.fromDefinition(
      authenticationErrorCatalog.passwordValidationFailed
    );
  }

  static accessTokenGenerationFailed(): AuthenticationError {
    return AuthenticationError.fromDefinition(
      authenticationErrorCatalog.accessTokenGenerationFailed
    );
  }

  static failedLoginAttemptsUpdateFailed(): AuthenticationError {
    return AuthenticationError.fromDefinition(
      authenticationErrorCatalog.failedLoginAttemptsUpdateFailed
    );
  }

  static failedLoginAttemptsResetFailed(): AuthenticationError {
    return AuthenticationError.fromDefinition(
      authenticationErrorCatalog.failedLoginAttemptsResetFailed
    );
  }

  static sessionReplacementFailed(): AuthenticationError {
    return AuthenticationError.fromDefinition(
      authenticationErrorCatalog.sessionReplacementFailed
    );
  }

  static sessionLifetimeConfigurationInvalid(): AuthenticationError {
    return AuthenticationError.fromDefinition(
      authenticationErrorCatalog.sessionLifetimeConfigurationInvalid
    );
  }
}
