import type { LoginPayload } from "@atlas/schemas/lib/auth/login.ts";
import type { NextFunction, Request, Response } from "express";
import { inject, injectable } from "inversify";
import type { LoginUserUseCase } from "../domain/use-cases/login.ts";

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
    const result = await this.loginUserUseCase.run(req.body);
    if (result.error) {
      next(result.error);
    }
    const { data: user } = result;
    res.status(200).json({ user });
  };
}
