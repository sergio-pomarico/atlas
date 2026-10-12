import type AuthenticationError from "@modules/auth/domain/error/index.ts";
import type { Result } from "@shared/domain/result.ts";

export interface CreateSessionInput {
  id: string;
  userId: string;
  ipAddress: string;
  userAgent: string | null;
  sessionTtlDays: number;
}

export interface SessionIdentity {
  sessionId: string;
  userId: string;
}

export interface SessionRepository {
  replaceActiveSession: (
    input: CreateSessionInput
  ) => Promise<Result<void, AuthenticationError>>;
  validateActiveSession: (
    identity: SessionIdentity
  ) => Promise<Result<boolean, AuthenticationError>>;
  revokeActiveSession: (
    identity: SessionIdentity
  ) => Promise<Result<boolean, AuthenticationError>>;
}
