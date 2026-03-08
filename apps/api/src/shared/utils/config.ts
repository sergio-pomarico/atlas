import path from "node:path";
import process from "node:process";

const __dirname = import.meta.dirname;

process.loadEnvFile(path.resolve(__dirname, "../../../.env"));
const { NODE_ENV, PORT, SECRET_MANAGER_TOKEN, INFISICAL_PROJECT_ID } =
  process.env;

export const envConfig = () => ({
  environment: NODE_ENV || "dev",
  port: Number.parseInt(PORT ?? "3000", 10),
  secretToken: SECRET_MANAGER_TOKEN ?? "",
  infisicalProjectId: INFISICAL_PROJECT_ID ?? "",
});
