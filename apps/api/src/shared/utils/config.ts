import path from "node:path";
import process from "node:process";

const __dirname = import.meta.dirname;

process.loadEnvFile(path.resolve(__dirname, "../../../.env"));
export const envConfig = () => ({
  environment: process.env.NODE_ENV || "dev",
  port: Number.parseInt(process.env.PORT ?? "3000", 10),
  secretToken: process.env.SECRET_MANAGER_TOKEN ?? "",
  infisicalProjectId: process.env.INFISICAL_PROJECT_ID ?? "",
  corsOrigin: getCorsOrigin(),
});

function getCorsOrigin(): string | null {
  const configuredOrigin = process.env.CORS_ORIGIN?.trim();

  if (configuredOrigin) {
    return configuredOrigin;
  }

  return process.env.NODE_ENV === "dev" ? "http://localhost:5173" : null;
}
