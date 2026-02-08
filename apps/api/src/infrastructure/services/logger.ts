import { AsyncStorageService } from "@api/infrastructure/services/async-storage.ts";

import type { DestinationStream, Logger as PinoLogger } from "pino";
import pino, { levels, transport as PinoTransport } from "pino";

export class Logger {
  private static instance: Logger;
  private readonly als = AsyncStorageService.getInstance();

  private constructor() {
    const transport: DestinationStream = PinoTransport({
      targets: [
        {
          target: "pino-pretty",
          level: "info",
          options: {
            destination: process.stdout.fd,
            colorize: true,
            translateTime: "yyyy-mm-dd HH:MM:ss",
          },
        },
      ],
    });
    this.logger = pino(
      {
        level: levels.labels[levels.values.info || 30],
        redact: {
          paths: [
            "*.verified",
            "*.password",
            "*.verificationCode",
            "*.passwordResetCode",
            "*.verificationCodeExpiresAt",
            "*.passwordResetCodeExpiresAt",
            "*.mfaSecret",
            "*.refreshTokenId",
          ],
          censor: "**********",
        },
      },
      transport
    );
  }

  private readonly logger: PinoLogger;

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private getRequestId(): string | undefined {
    const store = this.als.getStore();
    return store?.get("x-request-id");
  }

  private enrichArgs(args?: unknown): unknown {
    const requestId = this.getRequestId();
    if (!requestId) {
      return args;
    }

    if (!args || typeof args !== "object") {
      return { requestId };
    }

    return { ...args, requestId };
  }

  info(message: string, args?: unknown) {
    this.logger.info(this.enrichArgs(args), message);
  }

  warn(message: string, args?: unknown) {
    this.logger.warn(this.enrichArgs(args), message);
  }

  error(message: string, args?: unknown) {
    this.logger.error(this.enrichArgs(args), message);
  }

  fatal(message: string, args?: unknown) {
    this.logger.fatal(this.enrichArgs(args), message);
  }

  debug(message: string, args?: unknown) {
    this.logger.debug(this.enrichArgs(args), message);
  }
}

export const logger = Logger.getInstance();
