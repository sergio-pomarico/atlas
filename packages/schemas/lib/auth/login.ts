import { z } from "zod";
import passwordSchema from "../password.ts";

export const loginSchema = z.object({
  email: z.email(),
  password: passwordSchema,
});

export type LoginPayload = z.infer<typeof loginSchema>;
