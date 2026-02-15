import path from "node:path";
import process from "node:process";

const __dirname = import.meta.dirname;

process.loadEnvFile(path.resolve(__dirname, "../../.env"));
const { NODE_ENV, PORT } = process.env;

export const envConfig = () => ({
  environment: NODE_ENV || "development",
  port: Number.parseInt(PORT ?? "3000", 10),
});
