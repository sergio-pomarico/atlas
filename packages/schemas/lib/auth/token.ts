import { z } from "zod";

export const ACCESS_TOKEN_AUDIENCE = "atlas-client";
export const ACCESS_TOKEN_ISSUER = "atlas-api";
export const TOKEN_SCOPE = {
  ACCESS: "access",
  MFA: "mfa",
  REFRESH: "refresh",
} as const;

export const accessTokenSchema = z.object({
  sub: z.string().min(1),
  scope: z.literal(TOKEN_SCOPE.ACCESS),
  sid: z.string().min(1),
  iat: z.number(),
  exp: z.number(),
  iss: z.literal(ACCESS_TOKEN_ISSUER),
  aud: z.literal(ACCESS_TOKEN_AUDIENCE),
});

export type AccessToken = z.infer<typeof accessTokenSchema>;
