import type { LoginPayload } from "@atlas/schemas/lib/auth/login.ts";
import type {
  ForgotPasswordPayload,
  ResetPasswordPayload,
} from "@atlas/schemas/lib/auth/password-recovery.ts";
import type {
  ForgotPasswordResult,
  ForgotPasswordUseCase,
} from "@modules/auth/application/forgot-password-usecase.ts";
import type {
  LoginResult,
  LoginUserUseCase,
} from "@modules/auth/application/login-usecase.ts";
import type {
  ResetPasswordResult,
  ResetPasswordUseCase,
} from "@modules/auth/application/reset-password-usecase.ts";
import type { ApiSuccessResponse } from "@shared/domain/response.ts";
import type { NextFunction, Request, Response } from "express";
import { inject, injectable } from "inversify";

@injectable()
export class AuthController {
  private readonly loginUserUseCase: LoginUserUseCase;
  private readonly forgotPasswordUseCase: ForgotPasswordUseCase;
  private readonly resetPasswordUseCase: ResetPasswordUseCase;

  constructor(
    @inject("LoginUserUseCase") loginUserUseCase: LoginUserUseCase,
    @inject("ForgotPasswordUseCase")
    forgotPasswordUseCase: ForgotPasswordUseCase,
    @inject("ResetPasswordUseCase") resetPasswordUseCase: ResetPasswordUseCase
  ) {
    this.loginUserUseCase = loginUserUseCase;
    this.forgotPasswordUseCase = forgotPasswordUseCase;
    this.resetPasswordUseCase = resetPasswordUseCase;
  }

  login = async (
    req: Request<unknown, unknown, LoginPayload>,
    res: Response<ApiSuccessResponse<LoginResult>>,
    next: NextFunction
  ) => {
    const result = await this.loginUserUseCase.run(req.body);
    if (!result.isSuccess) {
      next(result.getError());
      return;
    }
    const credentials = result.getData();
    res.status(200).json({
      status: "success",
      message: "User logged in successfully",
      data: credentials,
    });
  };

  forgotPassword = async (
    req: Request<unknown, unknown, ForgotPasswordPayload>,
    res: Response<ApiSuccessResponse<ForgotPasswordResult>>,
    next: NextFunction
  ) => {
    const result = await this.forgotPasswordUseCase.run(req.body);
    if (!result.isSuccess) {
      next(result.getError());
      return;
    }
    res.status(200).json({
      status: "success",
      message:
        "If the email belongs to an eligible account, a code will be sent",
      data: result.getData(),
    });
  };

  resetPassword = async (
    req: Request<unknown, unknown, ResetPasswordPayload>,
    res: Response<ApiSuccessResponse<ResetPasswordResult>>,
    next: NextFunction
  ) => {
    const result = await this.resetPasswordUseCase.run(req.body);
    if (!result.isSuccess) {
      next(result.getError());
      return;
    }
    res.status(200).json({
      status: "success",
      message: "Password reset successfully",
      data: result.getData(),
    });
  };
}
