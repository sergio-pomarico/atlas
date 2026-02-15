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
    this.router.post("/login", this.controller.login);
  }
}
