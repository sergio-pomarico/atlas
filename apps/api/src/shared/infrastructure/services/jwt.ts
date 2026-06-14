import { SecretManagerService } from "@shared/infrastructure/services/secret-manager.ts";
import jwt from "jsonwebtoken";

export type Scope = "access" | "mfa" | "refresh";
type SigningKeyScope = Exclude<Scope, "mfa">;
export const JWT_ALGORITHM = "RS256";
export const JWT_AUDIENCE = "atlas-client";
export const JWT_ISSUER = "atlas-api";

export type JWTError = jwt.JsonWebTokenError | jwt.TokenExpiredError;

export interface Token {
  sub: string;
  email: string;
  scope: Scope;
  iat: number;
  exp: number;
  iss?: string;
  aud?: string;
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
    payload: Omit<Token, "iat" | "exp" | "iss" | "aud">,
    keyName: SigningKeyScope,
    options?: jwt.SignOptions | undefined,
  ): Promise<string | null> {
    const signingKey = await this.secretManager.getSecret(
      `${keyName}_key_private`,
    );
    return new Promise((resolve) => {
      jwt.sign(
        payload,
        signingKey.secretValue,
        {
          ...options,
          algorithm: JWT_ALGORITHM,
          audience: JWT_AUDIENCE,
          issuer: JWT_ISSUER,
        },
        (err, token) => {
          if (err) {
            return resolve(null);
          }
          return resolve(token || null);
        },
      );
    });
  }

  async verify<Token>(
    token: string,
    keyName: SigningKeyScope,
  ): Promise<Token | null> {
    const signingKey = await this.secretManager.getSecret(
      `${keyName}_key_public`,
    );
    return new Promise((resolve) => {
      jwt.verify(
        token,
        signingKey.secretValue,
        {
          algorithms: [JWT_ALGORITHM],
          audience: JWT_AUDIENCE,
          issuer: JWT_ISSUER,
        },
        (err, decoded) => {
          if (err) {
            return resolve(null);
          }
          return resolve(decoded as Token);
        },
      );
    });
  }
}
