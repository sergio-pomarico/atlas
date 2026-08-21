export interface PasswordRecoveryRateLimitResult {
  allowed: boolean;
  blockingTtlMilliseconds: number;
}

export interface PasswordRecoveryRateLimiter {
  consumeForgotPassword(
    email: string,
    ip: string
  ): Promise<PasswordRecoveryRateLimitResult>;
  clearResetPasswordEmailLimit(email: string): Promise<boolean>;
}
