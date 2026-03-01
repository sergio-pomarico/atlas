import type { PasswordHasher } from "@modules/auth/domain/password-hasher.ts";
import argon2 from "argon2";

export class ArgonPasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    const hash = await argon2.hash(password);
    return hash;
  }

  async compare(password: string, hash: string): Promise<boolean> {
    const isMatch = await argon2.verify(hash, password);
    return isMatch;
  }
}
