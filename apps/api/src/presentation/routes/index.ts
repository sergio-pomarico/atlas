import { AuthRoutes } from "@api/modules/auth/presentation/route.ts";
import { Router } from "express";

export class AppRoutes {
  readonly router: Router;

  constructor(router: Router = Router()) {
    this.router = router;
    this.routes();
  }
  routes(): void {
    this.router.use("/auth", new AuthRoutes().router);
  }
}
