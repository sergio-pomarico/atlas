import AuthenticationError from "@modules/auth/domain/error/index.ts";
import type { SessionRepository } from "@modules/auth/domain/session-repository.ts";
import { Result } from "@shared/domain/result.ts";
import { inject, injectable } from "inversify";

@injectable()
export class LogoutUserUseCase {
  private readonly sessionRepository: SessionRepository;

  constructor(
    @inject("SessionRepository")
    sessionRepository: SessionRepository
  ) {
    this.sessionRepository = sessionRepository;
  }

  async run(
    sessionId: string,
    userId: string
  ): Promise<Result<void, AuthenticationError>> {
    const result = await this.sessionRepository.revokeActiveSession({
      sessionId,
      userId,
    });
    if (!result.isSuccess) {
      return Result.fail(result.getError());
    }
    return result.getData()
      ? Result.success(undefined)
      : Result.fail(AuthenticationError.unauthorized());
  }
}
