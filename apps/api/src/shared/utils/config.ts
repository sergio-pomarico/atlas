import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const __dirname = import.meta.dirname;
const localEnvFilePath = path.resolve(__dirname, "../../../.env");
const defaultCorsOrigin = "http://localhost:5173";

loadLocalEnvFile();

export const envConfig = (env: NodeJS.ProcessEnv = process.env) => {
  const environment = resolveEnvironment(env);

  return {
    environment,
    port: resolvePort(env),
    secretToken: env.SECRET_MANAGER_TOKEN ?? "",
    infisicalProjectId: env.INFISICAL_PROJECT_ID ?? "",
    corsOrigin: resolveCorsOrigin(env.CORS_ORIGIN, environment),
  };
};

export function loadLocalEnvFile(filePath = localEnvFilePath): void {
  if (existsSync(filePath)) {
    process.loadEnvFile(filePath);
  }
}

function resolveEnvironment(env: NodeJS.ProcessEnv): string {
  return env.NODE_ENV ?? "dev";
}

function resolvePort(env: NodeJS.ProcessEnv): number {
  return Number.parseInt(env.PORT ?? "3000", 10);
}

function resolveCorsOrigin(
  configuredOrigin: string | undefined,
  environment: string
): string | null {
  const origin = configuredOrigin?.trim();

  if (origin) {
    return origin;
  }

  return environment === "dev" ? defaultCorsOrigin : null;
}
