import { z } from "zod";

const UPPERCASE_REGEX = /[A-Z]/;
const LOWERCASE_REGEX = /[a-z]/;
const NUMBER_REGEX = /[0-9]/;
const SPECIAL_CHAR_REGEX = /[!@#$%^&*]/;

const passwordSchema = z
  .string()
  .min(8, { message: "Password length must be greater than 8 characters" })
  .max(32, { message: "Password length must be less than 32 characters" })
  .refine((password) => UPPERCASE_REGEX.test(password), {
    message: "Password must contain at least one uppercase letter",
  })
  .refine((password) => LOWERCASE_REGEX.test(password), {
    message: "Password must contain at least one lowercase letter",
  })
  .refine((password) => NUMBER_REGEX.test(password), {
    message: "Password must contain at least one number",
  })
  .refine((password) => SPECIAL_CHAR_REGEX.test(password), {
    message: "Password must contain at least one special character",
  });

export default passwordSchema;
