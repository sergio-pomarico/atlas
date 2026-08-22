import { randomInt } from "node:crypto";

const CODE_UPPER_BOUND = 1_000_000;

export function generatePasswordRecoveryCode(): string {
  return randomInt(CODE_UPPER_BOUND).toString().padStart(6, "0");
}
