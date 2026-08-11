import { z } from "zod";
import passwordSchema from "../password.ts";

export const forgotPasswordSchema = z
  .object({
    email: z.email(),
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    resetRequestId: z.uuid(),
    code: z.string().regex(/^\d{6}$/),
    password: passwordSchema,
  })
  .strict();

export type ForgotPasswordPayload = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordPayload = z.infer<typeof resetPasswordSchema>;
