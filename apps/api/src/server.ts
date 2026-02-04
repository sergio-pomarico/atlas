import {
  createServer,
  type Server as HTTPServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
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
    this.app.use(express.urlencoded({ extended: true }));
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
