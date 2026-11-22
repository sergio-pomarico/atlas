import { defineConfig } from "rolldown";
import packageJson from "./package.json" with { type: "json" };

const runtimeDependencies = Object.keys(packageJson.dependencies).filter(
  (dependency) => !dependency.startsWith("@atlas/")
);
const isRuntimeDependency = (id) =>
  runtimeDependencies.some(
    (dependency) => id === dependency || id.startsWith(`${dependency}/`)
  );

export default defineConfig({
  input: "src/app.ts",
  platform: "node",
  tsconfig: "./tsconfig.json",
  transform: {
    target: "node24",
  },
  external: isRuntimeDependency,
  onLog(level, log, defaultHandler) {
    if (log.code === "UNRESOLVED_IMPORT") {
      defaultHandler("error", log);
      return;
    }

    defaultHandler(level, log);
  },
  output: {
    file: "dist/app.js",
    format: "esm",
    cleanDir: true,
    codeSplitting: false,
  },
});
