import { UserStatus } from "@atlas/entities/user.ts";
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

describe("DELETE /api/auth/logout e2e", () => {
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

  it("logs out the current session and rejects the same token afterwards", async () => {
    await context.createUser({
      email: "logout@example.com",
      password: "Password123!",
    });
    const login = await request(context.app).post("/api/auth/login").send({
      email: "logout@example.com",
      password: "Password123!",
    });
    const token = login.body.data.accessToken as string;

    const logout = await request(context.app)
      .delete("/api/auth/logout")
      .set("Authorization", token);
    const rejectedLogout = await request(context.app)
      .delete("/api/auth/logout")
      .set("Authorization", token);
    const refreshCookies = logout.headers["set-cookie"];
    const refreshCookie = String(refreshCookies);

    expect(logout.status).toBe(204);
    expect(refreshCookies).toEqual([expect.stringContaining("refresh_token=")]);
    expect(refreshCookie).toContain("Path=/api/auth");
    expect(refreshCookie).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
    expect(refreshCookie).toContain("HttpOnly");
    expect(refreshCookie).toContain("SameSite=Lax");
    expect(rejectedLogout.status).toBe(401);
    expect(rejectedLogout.headers["set-cookie"]).toBeUndefined();
  });

  it("rejects a token after its user is blocked", async () => {
    const user = await context.createUser({
      email: "blocked-after-login@example.com",
      password: "Password123!",
    });
    const login = await request(context.app).post("/api/auth/login").send({
      email: "blocked-after-login@example.com",
      password: "Password123!",
    });
    await context.postgres.prisma.user.update({
      where: { id: user.id },
      data: { status: UserStatus.BLOCKED },
    });

    await expect(
      request(context.app)
        .delete("/api/auth/logout")
        .set("Authorization", login.body.data.accessToken)
    ).resolves.toMatchObject({ status: 401 });
  });

  it("rejects a token after its session expires", async () => {
    const user = await context.createUser({
      email: "expired-after-login@example.com",
      password: "Password123!",
    });
    const login = await request(context.app).post("/api/auth/login").send({
      email: "expired-after-login@example.com",
      password: "Password123!",
    });
    await context.postgres.prisma.session.updateMany({
      where: { userId: user.id },
      data: { expiresAt: new Date("2020-01-01T00:00:00.000Z") },
    });

    await expect(
      request(context.app)
        .delete("/api/auth/logout")
        .set("Authorization", login.body.data.accessToken)
    ).resolves.toMatchObject({ status: 401 });
  });
});
