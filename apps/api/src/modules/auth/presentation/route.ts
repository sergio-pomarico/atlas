import { loginSchema } from "@atlas/schemas/lib/auth/login.ts";
import { schemaValidation } from "@shared/infrastructure/middlewares/validation.ts";
import { Router } from "express";
import container from "../infrastructure/container.ts";
import type { AuthController } from "./controller.ts";

export class AuthRoutes {
  readonly router: Router;
  private readonly controller: AuthController;
  constructor() {
    this.router = Router();
    this.controller = container.get<AuthController>("AuthController");
    this.routes();
  }

  routes(): void {
    this.router.post(
      "/login",
      schemaValidation(loginSchema),
      this.controller.login
    );
  }
}
