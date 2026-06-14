import { beforeEach, describe, expect, it } from "@jest/globals";
import { ArgonPasswordHasher } from "@modules/auth/infrastructure/password-hasher-impl.ts";

describe("ArgonPasswordHasher", () => {
  let passwordHasher: ArgonPasswordHasher;

  beforeEach(() => {
    passwordHasher = new ArgonPasswordHasher();
  });

  it("hashes and verifies a password with argon2", async () => {
    const hash = await passwordHasher.hash("plain-password");

    expect(hash).not.toBe("plain-password");
    expect(hash.length).toBeGreaterThan(0);
    await expect(passwordHasher.compare("plain-password", hash)).resolves.toBe(
      true
    );
    await expect(passwordHasher.compare("wrong-password", hash)).resolves.toBe(
      false
    );
  });
});
