import type { LoginPayload } from "@atlas/schemas/lib/auth/login.ts";
import type {
  LoginResult,
  LoginUserUseCase,
} from "@modules/auth/application/login-usecase.ts";
import type { ApiSuccessResponse } from "@shared/domain/response.ts";
import type { NextFunction, Request, Response } from "express";
import { inject, injectable } from "inversify";

@injectable()
export class AuthController {
  private readonly loginUserUseCase: LoginUserUseCase;

  constructor(@inject("LoginUserUseCase") loginUserUseCase: LoginUserUseCase) {
    this.loginUserUseCase = loginUserUseCase;
  }

  login = async (
    req: Request<unknown, unknown, LoginPayload>,
    res: Response<ApiSuccessResponse<LoginResult>>,
    next: NextFunction
  ) => {
    const userAgent = req.get("user-agent")?.trim();
    const result = await this.loginUserUseCase.run({
      email: req.body.email,
      password: req.body.password,
      ipAddress: req.ip ?? "unknown",
      userAgent: userAgent ? userAgent.slice(0, 512) : null,
    });
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
}
