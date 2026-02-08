import { Router } from "express";

export class AppRoutes {
  readonly router: Router;

  constructor(router: Router = Router()) {
    this.router = router;
    this.routes();
  }
  routes(): void {
    return;
  }
}
