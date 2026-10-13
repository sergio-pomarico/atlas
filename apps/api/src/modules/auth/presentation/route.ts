import { loginSchema } from "@atlas/schemas/lib/auth/login.ts";
import { TOKEN_SCOPE } from "@atlas/schemas/lib/auth/token.ts";
import type { AuthMiddleware } from "@modules/auth/presentation/auth-middleware.ts";
import { schemaValidation } from "@shared/infrastructure/middlewares/validation.ts";
import { Router } from "express";
import container from "../infrastructure/container.ts";
import type { AuthController } from "./controller.ts";

export class AuthRoutes {
  readonly router: Router;
  private readonly controller: AuthController;
  private readonly authMiddleware: AuthMiddleware;
  constructor() {
    this.router = Router();
    this.controller = container.get<AuthController>("AuthController");
    this.authMiddleware = container.get<AuthMiddleware>("AuthMiddleware");
    this.routes();
  }

  routes(): void {
    this.router.post(
      "/login",
      schemaValidation(loginSchema),
      this.controller.login
    );
    this.router.post("/refresh", this.controller.refresh);
    this.router.delete(
      "/logout",
      this.authMiddleware.require(TOKEN_SCOPE.ACCESS),
      this.controller.logout
    );
  }
}
