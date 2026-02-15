import { randomUUID } from "node:crypto";
import { AsyncStorageService } from "@shared/infrastructure/services/async-storage.ts";
import type { NextFunction, Request, Response } from "express";

const store = new Map<string, string>();
const als = AsyncStorageService.getInstance();

const requestIDMiddleware = (_: Request, __: Response, next: NextFunction) => {
  const requestId = randomUUID();
  store.set("x-request-id", requestId);
  als.runWithStore(store, () => next());
};

export default requestIDMiddleware;
