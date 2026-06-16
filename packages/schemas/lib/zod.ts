import type { ZodError, ZodType } from "zod";
import { fromZodError } from "zod-validation-error";

export type Schema = ZodType;

export const zodError = (error: ZodError) => fromZodError(error);
