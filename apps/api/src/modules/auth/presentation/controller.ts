import type { LoginPayload } from "@atlas/schemas/lib/auth/login.ts";
import type { NextFunction, Request, Response } from "express";
import { inject, injectable } from "inversify";
import type { LoginUserUseCase } from "../application/login-usecase.ts";

@injectable()
export class AuthController {
  private readonly loginUserUseCase: LoginUserUseCase;

  constructor(@inject("LoginUserUseCase") loginUserUseCase: LoginUserUseCase) {
    this.loginUserUseCase = loginUserUseCase;
  }

  login = async (
    req: Request<unknown, unknown, LoginPayload>,
    res: Response,
    next: NextFunction
  ) => {
    console.log("Login request received with body:", req.body);
    const result = await this.loginUserUseCase.run(req.body);
    console.log("Login use case result:", result);
    if (!result.isSuccess) {
      next(result);
    }
    const user = result.getData();
    res.status(200).json({ user });
  };
}
