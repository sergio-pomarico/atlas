import type AuthenticationError from "@modules/auth/domain/error.ts";
import type { Result } from "@shared/domain/result.ts";

export interface CreateSessionInput {
  userId: string;
  ipAddress: string;
  userAgent: string | null;
  sessionTtlDays: number;
}

export interface SessionRepository {
  replaceActiveSession: (
    input: CreateSessionInput
  ) => Promise<Result<void, AuthenticationError>>;
}
