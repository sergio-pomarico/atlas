import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "@jest/globals";
import { envConfig, loadLocalEnvFile } from "@shared/utils/config.ts";

describe("envConfig", () => {
  it("uses a configured CORS origin", () => {
    expect(
      envConfig({ CORS_ORIGIN: " https://client.example " }).corsOrigin
    ).toBe("https://client.example");
  });

  it("uses the local client origin in development", () => {
    expect(envConfig({ NODE_ENV: "dev" }).corsOrigin).toBe(
      "http://localhost:5173"
    );
  });

  it("does not allow a CORS origin by default outside development", () => {
    expect(envConfig({ NODE_ENV: "production" }).corsOrigin).toBeNull();
  });

  it("does not throw when the local env file is missing", () => {
    const missingEnvFile = path.join(tmpdir(), "atlas-missing.env");

    expect(() => loadLocalEnvFile(missingEnvFile)).not.toThrow();
  });
});
