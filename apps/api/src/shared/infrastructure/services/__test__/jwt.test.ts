import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { JWTService, type Token } from "@shared/infrastructure/services/jwt.ts";
import { SecretMangerService } from "@shared/infrastructure/services/secret-manager.ts";
import jwt from "jsonwebtoken";

const mockGetSecret = jest.fn<SecretMangerService["getSecret"]>();

describe("JWTService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (JWTService as unknown as { instance?: JWTService }).instance = undefined;
    jest.spyOn(SecretMangerService, "getInstance").mockReturnValue({
      getSecret: mockGetSecret,
    } as unknown as SecretMangerService);
  });

  it("returns the same singleton instance", () => {
    const firstInstance = JWTService.getInstance();
    const secondInstance = JWTService.getInstance();

    expect(secondInstance).toBe(firstInstance);
  });

  it("signs access tokens with RS256, issuer, and audience options", async () => {
    mockGetSecret.mockResolvedValue({ secretValue: "private-key" } as never);
    const signSpy = jest
      .spyOn(jwt, "sign")
      .mockImplementation((_payload, _secret, _options, callback) => {
        callback?.(null, "signed-token");
      });
    const jwtService = JWTService.getInstance();

    await expect(
      jwtService.sign(
        { sub: "user-123", email: "user@example.com", scope: "access" },
        "access",
        { expiresIn: "5m" }
      )
    ).resolves.toBe("signed-token");

    expect(mockGetSecret).toHaveBeenCalledWith("access_key_private");
    expect(signSpy.mock.calls[0]?.[0]).toEqual({
      sub: "user-123",
      email: "user@example.com",
      scope: "access",
    });
    expect(signSpy.mock.calls[0]?.[1]).toBe("private-key");
    expect(signSpy.mock.calls[0]?.[2]).toEqual({
      expiresIn: "5m",
      algorithm: "RS256",
      audience: "atlas-client",
      issuer: "atlas-api",
    });
    expect(signSpy.mock.calls[0]?.[3]).toEqual(expect.any(Function));
  });

  it("does not allow caller options to override critical JWT settings", async () => {
    mockGetSecret.mockResolvedValue({ secretValue: "private-key" } as never);
    const signSpy = jest
      .spyOn(jwt, "sign")
      .mockImplementation((_payload, _secret, _options, callback) => {
        callback?.(null, "signed-token");
      });
    const jwtService = JWTService.getInstance();

    await jwtService.sign(
      { sub: "user-123", email: "user@example.com", scope: "access" },
      "access",
      {
        algorithm: "HS256",
        audience: "bad-client",
        issuer: "bad-api",
      }
    );

    expect(signSpy.mock.calls[0]?.[2]).toEqual({
      algorithm: "RS256",
      audience: "atlas-client",
      issuer: "atlas-api",
    });
  });

  it("uses the refresh private key when signing refresh tokens", async () => {
    mockGetSecret.mockResolvedValue({ secretValue: "private-key" } as never);
    jest
      .spyOn(jwt, "sign")
      .mockImplementation((_payload, _secret, _options, callback) => {
        callback?.(null, "refresh-token");
      });
    const jwtService = JWTService.getInstance();

    await jwtService.sign(
      { sub: "user-123", email: "user@example.com", scope: "refresh" },
      "refresh"
    );

    expect(mockGetSecret).toHaveBeenCalledWith("refresh_key_private");
  });

  it("returns null when signing fails", async () => {
    mockGetSecret.mockResolvedValue({ secretValue: "private-key" } as never);
    jest
      .spyOn(jwt, "sign")
      .mockImplementation((_payload, _secret, _options, callback) => {
        callback?.(new Error("sign failed"), undefined);
      });
    const jwtService = JWTService.getInstance();

    await expect(
      jwtService.sign(
        { sub: "user-123", email: "user@example.com", scope: "access" },
        "access"
      )
    ).resolves.toBeNull();
  });

  it("returns null when signing succeeds without a token", async () => {
    mockGetSecret.mockResolvedValue({ secretValue: "private-key" } as never);
    jest
      .spyOn(jwt, "sign")
      .mockImplementation((_payload, _secret, _options, callback) => {
        callback?.(null, undefined);
      });
    const jwtService = JWTService.getInstance();

    await expect(
      jwtService.sign(
        { sub: "user-123", email: "user@example.com", scope: "access" },
        "access"
      )
    ).resolves.toBeNull();
  });

  it("verifies tokens with RS256, issuer, and audience constraints", async () => {
    const decodedToken: Token = {
      sub: "user-123",
      email: "user@example.com",
      scope: "access",
      iat: 1,
      exp: 2,
      iss: "atlas-api",
      aud: "atlas-client",
    };
    mockGetSecret.mockResolvedValue({ secretValue: "public-key" } as never);
    const verifySpy = jest
      .spyOn(jwt, "verify")
      .mockImplementation((_token, _secret, _options, callback) => {
        callback?.(null, decodedToken);
      });
    const jwtService = JWTService.getInstance();

    await expect(jwtService.verify<Token>("jwt-token", "access")).resolves.toBe(
      decodedToken
    );
    expect(mockGetSecret).toHaveBeenCalledWith("access_key_public");
    expect(verifySpy).toHaveBeenCalledWith(
      "jwt-token",
      "public-key",
      {
        algorithms: ["RS256"],
        audience: "atlas-client",
        issuer: "atlas-api",
      },
      expect.any(Function)
    );
  });

  it("returns null when token verification fails", async () => {
    mockGetSecret.mockResolvedValue({ secretValue: "public-key" } as never);
    jest
      .spyOn(jwt, "verify")
      .mockImplementation((_token, _secret, _options, callback) => {
        callback?.(new jwt.JsonWebTokenError("verify failed"), undefined);
      });
    const jwtService = JWTService.getInstance();

    await expect(
      jwtService.verify<Token>("jwt-token", "access")
    ).resolves.toBeNull();
  });

  it("returns null when token audience is invalid", async () => {
    mockGetSecret.mockResolvedValue({ secretValue: "public-key" } as never);
    jest
      .spyOn(jwt, "verify")
      .mockImplementation((_token, _secret, _options, callback) => {
        callback?.(
          new jwt.JsonWebTokenError("jwt audience invalid"),
          undefined
        );
      });
    const jwtService = JWTService.getInstance();

    await expect(
      jwtService.verify<Token>("jwt-token", "access")
    ).resolves.toBeNull();
  });

  it("returns null when token issuer is invalid", async () => {
    mockGetSecret.mockResolvedValue({ secretValue: "public-key" } as never);
    jest
      .spyOn(jwt, "verify")
      .mockImplementation((_token, _secret, _options, callback) => {
        callback?.(new jwt.JsonWebTokenError("jwt issuer invalid"), undefined);
      });
    const jwtService = JWTService.getInstance();

    await expect(
      jwtService.verify<Token>("jwt-token", "access")
    ).resolves.toBeNull();
  });
});
