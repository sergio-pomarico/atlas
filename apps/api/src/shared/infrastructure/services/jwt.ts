import {
  ACCESS_TOKEN_AUDIENCE,
  ACCESS_TOKEN_ISSUER,
  type AccessToken,
  accessTokenSchema,
  type TOKEN_SCOPE,
} from "@atlas/schemas/lib/auth/token.ts";
import { SecretManagerService } from "@shared/infrastructure/services/secret-manager.ts";
import jwt from "jsonwebtoken";

export const JWT_ALGORITHM = "RS256";

export type JWTError = jwt.JsonWebTokenError | jwt.TokenExpiredError;

export type AccessTokenPayload = Omit<
  AccessToken,
  "iat" | "exp" | "iss" | "aud"
>;
interface RefreshTokenPayload {
  sub: string;
  scope: typeof TOKEN_SCOPE.REFRESH;
}
export type TokenPayload = AccessTokenPayload | RefreshTokenPayload;
type SigningKeyScope = TokenPayload["scope"];

export function parseAccessToken(payload: unknown): AccessToken | null {
  const result = accessTokenSchema.safeParse(payload);
  return result.success ? result.data : null;
}

export class JWTService {
  private static instance: JWTService;
  private readonly secretManager: SecretManagerService;
  private constructor() {
    this.secretManager = SecretManagerService.getInstance();
  }

  static getInstance(): JWTService {
    if (!JWTService.instance) {
      JWTService.instance = new JWTService();
    }
    return JWTService.instance;
  }

  async sign(
    payload: TokenPayload,
    keyName: SigningKeyScope,
    options?: jwt.SignOptions | undefined
  ): Promise<string | null> {
    const signingKey = await this.secretManager.getSecret(
      `${keyName}_key_private`
    );
    return new Promise((resolve) => {
      jwt.sign(
        payload,
        signingKey.secretValue,
        {
          ...options,
          algorithm: JWT_ALGORITHM,
          audience: ACCESS_TOKEN_AUDIENCE,
          issuer: ACCESS_TOKEN_ISSUER,
        },
        (err, token) => {
          if (err) {
            return resolve(null);
          }
          return resolve(token || null);
        }
      );
    });
  }

  async verify(
    token: string,
    keyName: SigningKeyScope
  ): Promise<unknown | null> {
    const signingKey = await this.secretManager.getSecret(
      `${keyName}_key_public`
    );
    return new Promise((resolve) => {
      jwt.verify(
        token,
        signingKey.secretValue,
        {
          algorithms: [JWT_ALGORITHM],
          audience: ACCESS_TOKEN_AUDIENCE,
          issuer: ACCESS_TOKEN_ISSUER,
        },
        (err, decoded) => {
          if (err) {
            return resolve(null);
          }
          return resolve(decoded);
        }
      );
    });
  }
}
