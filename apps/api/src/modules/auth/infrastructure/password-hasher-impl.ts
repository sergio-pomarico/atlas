import argon2 from "argon2";
import type { PasswordHasher } from "../domain/password-hasher.ts";

export class ArgonPasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    const hash = await argon2.hash(password);
    return hash;
  }

  async compare(password: string, hash: string): Promise<boolean> {
    const isMatch = await argon2.verify(password, hash);
    return isMatch;
  }
}
