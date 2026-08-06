import { describe, expect, it } from "@jest/globals";
import { createCorsMiddleware } from "@shared/infrastructure/middlewares/cors.ts";
import express from "express";
import request from "supertest";

const allowedOrigin = "http://localhost:5173";

describe("CORS middleware integration", () => {
  it("allows an OPTIONS preflight from a configured origin", async () => {
    const response = await request(createApp())
      .options("/api/auth/login")
      .set("Origin", allowedOrigin)
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "Content-Type, Authorization");

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe(allowedOrigin);
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
    expect(response.headers["access-control-allow-methods"]).toBe(
      "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    );
    expect(response.headers["access-control-allow-headers"]).toBe(
      "Content-Type,Authorization"
    );
  });

  it("sets credentialed CORS headers on an allowed POST", async () => {
    const response = await request(createApp())
      .post("/api/auth/login")
      .set("Origin", allowedOrigin)
      .send({});

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe(allowedOrigin);
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("does not set CORS headers for a rejected browser origin", async () => {
    const response = await request(createApp())
      .post("/api/auth/login")
      .set("Origin", "https://foreign.example")
      .send({});

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("allows requests without an Origin header to reach the API", async () => {
    const response = await request(createApp())
      .post("/api/auth/login")
      .send({});

    expect(response.status).toBe(204);
  });
});

function createApp() {
  const app = express();
  app.use(createCorsMiddleware(allowedOrigin));
  app.post("/api/auth/login", (_, response) => response.sendStatus(204));
  return app;
}
