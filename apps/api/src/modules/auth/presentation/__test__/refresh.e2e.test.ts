import {
  type AuthE2EContext,
  startAuthE2EContext,
} from "@helpers/test/auth-e2e.ts";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "@jest/globals";
import request from "supertest";

describe("POST /api/auth/refresh e2e", () => {
  let context: AuthE2EContext;

  beforeAll(async () => {
    context = await startAuthE2EContext();
  }, 60_000);

  beforeEach(async () => {
    await context.reset();
  });

  afterAll(async () => {
    await context?.stop();
  }, 60_000);

  it("refreshes the access token without rotating the session or cookie", async () => {
    const client = request.agent(context.app);
    const user = await context.createUser({
      email: "refresh@example.com",
      password: "Password123!",
    });
    const login = await client.post("/api/auth/login").send({
      email: "refresh@example.com",
      password: "Password123!",
    });
    const session = await context.postgres.prisma.session.findFirstOrThrow({
      where: { userId: user.id },
    });

    const response = await client.post("/api/auth/refresh");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "success",
      message: "Access token refreshed successfully",
      data: {
        accessToken: expect.stringContaining(
          `test-access-token-${session.id}-`
        ),
      },
    });
    expect(response.body.data.accessToken).not.toBe(
      login.body.data.accessToken
    );
    expect(response.headers["set-cookie"]).toBeUndefined();
    expect(
      await context.postgres.prisma.session.count({
        where: { userId: user.id },
      })
    ).toBe(1);
  });

  it("clears an invalid refresh cookie", async () => {
    const response = await request(context.app)
      .post("/api/auth/refresh")
      .set("Cookie", "refresh_token=invalid-token");

    expect(response.status).toBe(401);
    expect(response.headers["set-cookie"]?.[0]).toContain("refresh_token=");
    expect(response.headers["set-cookie"]?.[0]).toContain("Path=/api/auth");
    expect(response.headers["set-cookie"]?.[0]).toContain(
      "Expires=Thu, 01 Jan 1970 00:00:00 GMT"
    );
  });

  it("clears the refresh cookie when its session is expired", async () => {
    const client = request.agent(context.app);
    const user = await context.createUser({
      email: "expired-refresh@example.com",
      password: "Password123!",
    });
    await client.post("/api/auth/login").send({
      email: "expired-refresh@example.com",
      password: "Password123!",
    });
    await context.postgres.prisma.session.updateMany({
      where: { userId: user.id },
      data: { expiresAt: new Date(0) },
    });

    const response = await client.post("/api/auth/refresh");

    expect(response.status).toBe(401);
    expect(response.headers["set-cookie"]?.[0]).toContain("refresh_token=");
  });

  it("preserves the refresh cookie when access token signing fails", async () => {
    const client = request.agent(context.app);
    await context.createUser({
      email: "refresh-signing-failure@example.com",
      password: "Password123!",
    });
    await client.post("/api/auth/login").send({
      email: "refresh-signing-failure@example.com",
      password: "Password123!",
    });
    context.mockJWTService.sign.mockRejectedValueOnce(
      new Error("Signing failed")
    );

    const response = await client.post("/api/auth/refresh");

    expect(response.status).toBe(500);
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it("clears the refresh cookie when it is missing", async () => {
    const response = await request(context.app).post("/api/auth/refresh");

    expect(response.status).toBe(401);
    expect(response.headers["set-cookie"]?.[0]).toContain("refresh_token=");
  });
});
