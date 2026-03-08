import { SecretMangerService } from "@shared/infrastructure/services/secret-manager.ts";
import jwt from "jsonwebtoken";

type Scope = "access" | "mfa" | "refresh";

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
  private readonly secretManager: SecretMangerService;
  private constructor() {
    this.secretManager = SecretMangerService.getInstance();
  }

  static getInstance(): JWTService {
    if (!JWTService.instance) {
      JWTService.instance = new JWTService();
    }
    return JWTService.instance;
  }

  async sign(
    payload: Omit<Token, "iat" | "exp">,
    keyName: Omit<Scope, "mfa">,
    options?: jwt.SignOptions | undefined
  ): Promise<string | null> {
    const signingKey = await this.secretManager.getSecret(
      `${keyName}_key_private`
    );
    return new Promise((resolve) => {
      jwt.sign(
        { issuer: "atlas-api", audience: "atlas-client", ...payload },
        signingKey.secretValue,
        { ...options, algorithm: "RS256" },
        (err, token) => {
          if (err) {
            return resolve(null);
          }
          return resolve(token || null);
        }
      );
    });
  }

  async verify<Token>(
    token: string,
    keyName: Omit<Scope, "mfa">
  ): Promise<Token | null> {
    const signingKey = await this.secretManager.getSecret(
      `${keyName}_key_public`
    );
    return new Promise((resolve) => {
      jwt.verify(
        token,
        signingKey.secretValue,
        { algorithms: ["RS256"] },
        (err, decoded) => {
          if (err) {
            return resolve(null);
          }
          return resolve(decoded as Token);
        }
      );
    });
  }
}
