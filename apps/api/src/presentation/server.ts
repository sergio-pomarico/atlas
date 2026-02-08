import type {
  Server as HTTPServer,
  IncomingMessage,
  ServerResponse,
} from "node:http";
import { createServer } from "node:http";
import errorMiddleware from "@api/presentation/middlewares/error.ts";
import requestIDMiddleware from "@api/presentation/middlewares/request-id.ts";
import { AppRoutes } from "@api/presentation/routes/index.ts";
import express, { type Application } from "express";

export class Server {
  private listener: HTTPServer<
    typeof IncomingMessage,
    typeof ServerResponse
  > | null = null;

  readonly app: Application = express();
  private readonly port: number;

  http: HTTPServer;

  constructor(port: number) {
    this.app.use(express.json());
    this.app.use(requestIDMiddleware);
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use("/api", new AppRoutes().router);
    this.app.use(errorMiddleware);
    this.http = createServer(this.app);
    this.port = port;
  }

  start() {
    this.listener = this.http.listen(this.port, () => {
      console.info(`🚀 server run on port ${this.port}`);
    });
  }

  stop() {
    this.listener?.close();
  }
}
