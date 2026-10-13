import type { LoginPayload } from "@atlas/schemas/lib/auth/login.ts";
import type {
  LoginResult,
  LoginUserUseCase,
} from "@modules/auth/application/login-usecase.ts";
import type { LogoutUserUseCase } from "@modules/auth/application/logout-usecase.ts";
import type {
  RefreshAccessTokenResult,
  RefreshAccessTokenUseCase,
} from "@modules/auth/application/refresh-access-token-usecase.ts";
import AuthenticationError from "@modules/auth/domain/error/index.ts";
import type { ApiSuccessResponse } from "@shared/domain/response.ts";
import type { CookieOptions, NextFunction, Request, Response } from "express";
import { inject, injectable } from "inversify";

const REFRESH_TOKEN_COOKIE_NAME = "refresh_token";
const refreshTokenCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: false,
  sameSite: "lax",
  path: "/api/auth",
};

function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, refreshTokenCookieOptions);
}

function readRefreshTokenCookie(req: Request): string | null {
  const token: unknown = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];
  return typeof token === "string" && token.length > 0 ? token : null;
}

@injectable()
export class AuthController {
  private readonly loginUserUseCase: LoginUserUseCase;
  private readonly logoutUserUseCase: LogoutUserUseCase;
  private readonly refreshAccessTokenUseCase: RefreshAccessTokenUseCase;

  constructor(
    @inject("LoginUserUseCase") loginUserUseCase: LoginUserUseCase,
    @inject("LogoutUserUseCase") logoutUserUseCase: LogoutUserUseCase,
    @inject("RefreshAccessTokenUseCase")
    refreshAccessTokenUseCase: RefreshAccessTokenUseCase
  ) {
    this.loginUserUseCase = loginUserUseCase;
    this.logoutUserUseCase = logoutUserUseCase;
    this.refreshAccessTokenUseCase = refreshAccessTokenUseCase;
  }

  login = async (
    req: Request<unknown, unknown, LoginPayload>,
    res: Response<ApiSuccessResponse<Pick<LoginResult, "accessToken">>>,
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
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, credentials.refreshToken, {
      ...refreshTokenCookieOptions,
      expires: credentials.refreshTokenExpiresAt,
    });
    res.status(200).json({
      status: "success",
      message: "User logged in successfully",
      data: { accessToken: credentials.accessToken },
    });
  };

  refresh = async (
    req: Request,
    res: Response<ApiSuccessResponse<RefreshAccessTokenResult>>,
    next: NextFunction
  ) => {
    const refreshToken = readRefreshTokenCookie(req);
    if (!refreshToken) {
      clearRefreshTokenCookie(res);
      next(AuthenticationError.unauthorized());
      return;
    }

    const result = await this.refreshAccessTokenUseCase.run(refreshToken);
    if (!result.isSuccess) {
      const error = result.getError();
      if (error.statusCode === 401) {
        clearRefreshTokenCookie(res);
      }
      next(error);
      return;
    }

    res.status(200).json({
      status: "success",
      message: "Access token refreshed successfully",
      data: result.getData(),
    });
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      next(AuthenticationError.unauthorized());
      return;
    }
    const result = await this.logoutUserUseCase.run(
      req.auth.sessionId,
      req.auth.userId
    );
    if (!result.isSuccess) {
      next(result.getError());
      return;
    }
    clearRefreshTokenCookie(res);
    res.status(204).send();
  };
}
