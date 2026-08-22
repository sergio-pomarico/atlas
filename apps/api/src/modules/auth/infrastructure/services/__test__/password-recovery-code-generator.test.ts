import { describe, expect, it } from "@jest/globals";
import { generatePasswordRecoveryCode } from "@modules/auth/infrastructure/services/password-recovery-code-generator.ts";

const SIX_DECIMAL_DIGITS = /^\d{6}$/;

describe("generatePasswordRecoveryCode", () => {
  it("generates exactly six decimal digits", () => {
    for (let index = 0; index < 100; index += 1) {
      expect(generatePasswordRecoveryCode()).toMatch(SIX_DECIMAL_DIGITS);
    }
  });
});
