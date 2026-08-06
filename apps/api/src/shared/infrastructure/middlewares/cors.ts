import { envConfig } from "@shared/utils/config.ts";
import cors from "cors";

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];
const allowedHeaders = ["Content-Type", "Authorization"];

export const createCorsMiddleware = (
  allowedOrigin: string | null = envConfig().corsOrigin
) =>
  cors({
    origin: (origin, callback) => {
      callback(null, !origin || origin === allowedOrigin);
    },
    credentials: true,
    methods,
    allowedHeaders,
  });

export const corsMiddleware = createCorsMiddleware();
