import type { UserEntity } from "@atlas/entities/user.ts";
import { UserStatus } from "@atlas/entities/user.ts";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { LoginUserUseCase } from "@modules/auth/application/login-usecase.ts";
import AuthenticationError from "@modules/auth/domain/error.ts";
import type { PasswordHasher } from "@modules/auth/domain/password-hasher.ts";
import type { AuthRepository } from "@modules/auth/domain/repository.ts";
import { User } from "@modules/auth/domain/user.ts";
import { Result } from "@shared/domain/result.ts";
import type { JWTService } from "@shared/infrastructure/services/jwt.ts";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockAuthRepository: jest.Mocked<AuthRepository> = {
  findByEmail: jest.fn(),
  increaseFailedLoginAttempts: jest.fn(),
};

const mockPasswordHasher: jest.Mocked<PasswordHasher> = {
  hash: jest.fn(),
  compare: jest.fn(),
};

const mockJWTService = {
  sign: jest.fn() as jest.MockedFunction<JWTService["sign"]>,
  verify: jest.fn() as jest.MockedFunction<JWTService["verify"]>,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const baseUserEntity: UserEntity = {
  id: "user-123",
  email: "test@example.com",
  phone: 1_234_567_890,
  password: "hashedPassword123",
  verified: true,
  status: UserStatus.ACTIVE,
  failedLoginAttempts: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const validLoginPayload = {
  email: "test@example.com",
  password: "Password123!",
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("LoginUserUseCase", () => {
  let loginUserUseCase: LoginUserUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    loginUserUseCase = new LoginUserUseCase(
      mockAuthRepository,
      mockPasswordHasher,
      mockJWTService as unknown as JWTService,
    );
  });

  // -------------------------------------------------------------------------
  // Successful Login
  // -------------------------------------------------------------------------

  describe("Successful Login", () => {
    it("should return a success result with an access token on valid credentials", async () => {
      // Arrange
      mockAuthRepository.findByEmail.mockResolvedValue(
        Result.success(new User(baseUserEntity)),
      );
      mockPasswordHasher.compare.mockResolvedValue(true);
      mockJWTService.sign.mockResolvedValue("mock.jwt.token");

      // Act
      const result = await loginUserUseCase.run(validLoginPayload);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.getData().accessToken).toBe("mock.jwt.token");
    });

    it("should look up the user by the provided email", async () => {
      // Arrange
      mockAuthRepository.findByEmail.mockResolvedValue(
        Result.success(new User(baseUserEntity)),
      );
      mockPasswordHasher.compare.mockResolvedValue(true);
      mockJWTService.sign.mockResolvedValue("mock.jwt.token");

      // Act
      await loginUserUseCase.run(validLoginPayload);

      // Assert
      expect(mockAuthRepository.findByEmail).toHaveBeenCalledWith(
        "test@example.com",
      );
      expect(mockAuthRepository.findByEmail).toHaveBeenCalledTimes(1);
    });

    it("should compare the plain password against the stored hash", async () => {
      // Arrange
      mockAuthRepository.findByEmail.mockResolvedValue(
        Result.success(new User(baseUserEntity)),
      );
      mockPasswordHasher.compare.mockResolvedValue(true);
      mockJWTService.sign.mockResolvedValue("mock.jwt.token");

      // Act
      await loginUserUseCase.run(validLoginPayload);

      // Assert
      expect(mockPasswordHasher.compare).toHaveBeenCalledWith(
        "Password123!",
        "hashedPassword123",
      );
    });

    it("should sign the JWT with the correct payload and options", async () => {
      // Arrange
      mockAuthRepository.findByEmail.mockResolvedValue(
        Result.success(new User(baseUserEntity)),
      );
      mockPasswordHasher.compare.mockResolvedValue(true);
      mockJWTService.sign.mockResolvedValue("mock.jwt.token");

      // Act
      await loginUserUseCase.run(validLoginPayload);

      // Assert
      expect(mockJWTService.sign).toHaveBeenCalledWith(
        { sub: "user-123", email: "test@example.com", scope: "access" },
        "access",
        { expiresIn: "5m" },
      );
    });
  });

  // -------------------------------------------------------------------------
  // User Not Found
  // -------------------------------------------------------------------------

  describe("User Not Found", () => {
    it("should return a failure result when the user does not exist", async () => {
      // Arrange
      mockAuthRepository.findByEmail.mockResolvedValue(
        Result.fail(
          AuthenticationError.userNotFound(
            "User not found",
            "User with email does not exist",
          ),
        ),
      );

      // Act
      const result = await loginUserUseCase.run(validLoginPayload);

      // Assert
      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(AuthenticationError);
    });

    it("should not attempt password comparison when the user does not exist", async () => {
      // Arrange
      mockAuthRepository.findByEmail.mockResolvedValue(
        Result.fail(
          AuthenticationError.userNotFound(
            "User not found",
            "User with email does not exist",
          ),
        ),
      );

      // Act
      await loginUserUseCase.run(validLoginPayload);

      // Assert
      expect(mockPasswordHasher.compare).not.toHaveBeenCalled();
    });

    it("should not issue a token when the user does not exist", async () => {
      // Arrange
      mockAuthRepository.findByEmail.mockResolvedValue(
        Result.fail(
          AuthenticationError.userNotFound(
            "User not found",
            "User with email does not exist",
          ),
        ),
      );

      // Act
      await loginUserUseCase.run(validLoginPayload);

      // Assert
      expect(mockJWTService.sign).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Blocked User
  //
  // The guard runs BEFORE compare, so compare must never be called when the
  // user is blocked.
  // -------------------------------------------------------------------------

  describe("Blocked User", () => {
    const blockedUserEntity: UserEntity = {
      ...baseUserEntity,
      status: UserStatus.BLOCKED,
    };

    it("should return a failure result when the user is blocked", async () => {
      // Arrange
      mockAuthRepository.findByEmail.mockResolvedValue(
        Result.success(new User(blockedUserEntity)),
      );

      // Act
      const result = await loginUserUseCase.run(validLoginPayload);

      // Assert
      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(AuthenticationError);
    });

    it("should not attempt password comparison when the user is blocked", async () => {
      // Arrange
      mockAuthRepository.findByEmail.mockResolvedValue(
        Result.success(new User(blockedUserEntity)),
      );

      // Act
      await loginUserUseCase.run(validLoginPayload);

      // Assert
      expect(mockPasswordHasher.compare).not.toHaveBeenCalled();
    });

    it("should not issue a token when the user is blocked", async () => {
      // Arrange
      mockAuthRepository.findByEmail.mockResolvedValue(
        Result.success(new User(blockedUserEntity)),
      );

      // Act
      await loginUserUseCase.run(validLoginPayload);

      // Assert
      expect(mockJWTService.sign).not.toHaveBeenCalled();
    });

    it("should not call increaseFailedLoginAttempts when the user is blocked", async () => {
      // Arrange
      mockAuthRepository.findByEmail.mockResolvedValue(
        Result.success(new User(blockedUserEntity)),
      );

      // Act
      await loginUserUseCase.run(validLoginPayload);

      // Assert
      expect(
        mockAuthRepository.increaseFailedLoginAttempts,
      ).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Unverified User
  //
  // Same ordering guarantee as Blocked User: guard fires before compare.
  // -------------------------------------------------------------------------

  describe("Unverified User", () => {
    const unverifiedUserEntity: UserEntity = {
      ...baseUserEntity,
      verified: false,
    };

    it("should return a failure result when the user is not verified", async () => {
      // Arrange
      mockAuthRepository.findByEmail.mockResolvedValue(
        Result.success(new User(unverifiedUserEntity)),
      );

      // Act
      const result = await loginUserUseCase.run(validLoginPayload);

      // Assert
      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(AuthenticationError);
    });

    it("should not attempt password comparison when the user is not verified", async () => {
      // Arrange
      mockAuthRepository.findByEmail.mockResolvedValue(
        Result.success(new User(unverifiedUserEntity)),
      );

      // Act
      await loginUserUseCase.run(validLoginPayload);

      // Assert
      expect(mockPasswordHasher.compare).not.toHaveBeenCalled();
    });

    it("should not issue a token when the user is not verified", async () => {
      // Arrange
      mockAuthRepository.findByEmail.mockResolvedValue(
        Result.success(new User(unverifiedUserEntity)),
      );

      // Act
      await loginUserUseCase.run(validLoginPayload);

      // Assert
      expect(mockJWTService.sign).not.toHaveBeenCalled();
    });

    it("should not call increaseFailedLoginAttempts when the user is not verified", async () => {
      // Arrange
      mockAuthRepository.findByEmail.mockResolvedValue(
        Result.success(new User(unverifiedUserEntity)),
      );

      // Act
      await loginUserUseCase.run(validLoginPayload);

      // Assert
      expect(
        mockAuthRepository.increaseFailedLoginAttempts,
      ).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Invalid Credentials
  // -------------------------------------------------------------------------

  describe("Invalid Credentials", () => {
    it("should return a failure result when the password is wrong", async () => {
      // Arrange
      mockAuthRepository.findByEmail.mockResolvedValue(
        Result.success(new User(baseUserEntity)),
      );
      mockPasswordHasher.compare.mockResolvedValue(false);
      mockAuthRepository.increaseFailedLoginAttempts.mockResolvedValue(
        Result.success(undefined),
      );

      // Act
      const result = await loginUserUseCase.run(validLoginPayload);

      // Assert
      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(AuthenticationError);
    });

    it("should call compare with the plain password and stored hash", async () => {
      // Arrange
      mockAuthRepository.findByEmail.mockResolvedValue(
        Result.success(new User(baseUserEntity)),
      );
      mockPasswordHasher.compare.mockResolvedValue(false);
      mockAuthRepository.increaseFailedLoginAttempts.mockResolvedValue(
        Result.success(undefined),
      );

      // Act
      await loginUserUseCase.run(validLoginPayload);

      // Assert
      expect(mockPasswordHasher.compare).toHaveBeenCalledWith(
        "Password123!",
        "hashedPassword123",
      );
    });

    it("should call increaseFailedLoginAttempts with the user id on wrong password", async () => {
      // Arrange
      mockAuthRepository.findByEmail.mockResolvedValue(
        Result.success(new User(baseUserEntity)),
      );
      mockPasswordHasher.compare.mockResolvedValue(false);
      mockAuthRepository.increaseFailedLoginAttempts.mockResolvedValue(
        Result.success(undefined),
      );

      // Act
      await loginUserUseCase.run(validLoginPayload);

      // Assert
      expect(
        mockAuthRepository.increaseFailedLoginAttempts,
      ).toHaveBeenCalledWith("user-123");
      expect(
        mockAuthRepository.increaseFailedLoginAttempts,
      ).toHaveBeenCalledTimes(1);
    });

    it("should not issue a token when the password is wrong", async () => {
      // Arrange
      mockAuthRepository.findByEmail.mockResolvedValue(
        Result.success(new User(baseUserEntity)),
      );
      mockPasswordHasher.compare.mockResolvedValue(false);
      mockAuthRepository.increaseFailedLoginAttempts.mockResolvedValue(
        Result.success(undefined),
      );

      // Act
      await loginUserUseCase.run(validLoginPayload);

      // Assert
      expect(mockJWTService.sign).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // JWT Token Generation Error
  // -------------------------------------------------------------------------

  describe("JWT Token Generation Error", () => {
    it("should return a failure result when sign rejects", async () => {
      // Arrange
      mockAuthRepository.findByEmail.mockResolvedValue(
        Result.success(new User(baseUserEntity)),
      );
      mockPasswordHasher.compare.mockResolvedValue(true);
      mockJWTService.sign.mockRejectedValue(new Error("JWT generation failed"));

      // Act
      const result = await loginUserUseCase.run(validLoginPayload);

      // Assert
      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(AuthenticationError);
    });

    it("should return the 'Token generation failed' message when sign rejects", async () => {
      // Arrange
      mockAuthRepository.findByEmail.mockResolvedValue(
        Result.success(new User(baseUserEntity)),
      );
      mockPasswordHasher.compare.mockResolvedValue(true);
      mockJWTService.sign.mockRejectedValue(new Error("JWT generation failed"));

      // Act
      const result = await loginUserUseCase.run(validLoginPayload);

      // Assert
      expect(result.getError().message).toBe("Token generation failed");
    });

    it("should attempt to sign the token with the correct payload before failing", async () => {
      // Arrange
      mockAuthRepository.findByEmail.mockResolvedValue(
        Result.success(new User(baseUserEntity)),
      );
      mockPasswordHasher.compare.mockResolvedValue(true);
      mockJWTService.sign.mockRejectedValue(new Error("JWT generation failed"));

      // Act
      await loginUserUseCase.run(validLoginPayload);

      // Assert
      expect(mockJWTService.sign).toHaveBeenCalledWith(
        { sub: "user-123", email: "test@example.com", scope: "access" },
        "access",
        { expiresIn: "5m" },
      );
    });

    it("should not call increaseFailedLoginAttempts when sign rejects", async () => {
      // Arrange
      mockAuthRepository.findByEmail.mockResolvedValue(
        Result.success(new User(baseUserEntity)),
      );
      mockPasswordHasher.compare.mockResolvedValue(true);
      mockJWTService.sign.mockRejectedValue(new Error("JWT generation failed"));

      // Act
      await loginUserUseCase.run(validLoginPayload);

      // Assert
      expect(
        mockAuthRepository.increaseFailedLoginAttempts,
      ).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Password Hasher Error
  //
  // When compare throws, tryCatch returns Result.fail(error). The use-case
  // correctly evaluates `!isPasswordValid.isSuccess` and returns an
  // internalServerError — this is a system fault, NOT a failed login attempt,
  // so increaseFailedLoginAttempts must NOT be called.
  // -------------------------------------------------------------------------

  describe("Password Hasher Error", () => {
    it("should return a failure result when compare throws", async () => {
      // Arrange
      mockAuthRepository.findByEmail.mockResolvedValue(
        Result.success(new User(baseUserEntity)),
      );
      mockPasswordHasher.compare.mockRejectedValue(
        new Error("Hash comparison failed"),
      );
      // Act
      const result = await loginUserUseCase.run(validLoginPayload);

      // Assert
      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(AuthenticationError);
    });

    it("should not call increaseFailedLoginAttempts when compare throws", async () => {
      // Arrange — a hasher crash is a system fault, not a bad password entry.
      mockAuthRepository.findByEmail.mockResolvedValue(
        Result.success(new User(baseUserEntity)),
      );
      mockPasswordHasher.compare.mockRejectedValue(
        new Error("Hash comparison failed"),
      );

      // Act
      await loginUserUseCase.run(validLoginPayload);

      // Assert
      expect(
        mockAuthRepository.increaseFailedLoginAttempts,
      ).not.toHaveBeenCalled();
    });

    it("should not issue a token when compare throws", async () => {
      // Arrange
      mockAuthRepository.findByEmail.mockResolvedValue(
        Result.success(new User(baseUserEntity)),
      );
      mockPasswordHasher.compare.mockRejectedValue(
        new Error("Hash comparison failed"),
      );
      // Act
      await loginUserUseCase.run(validLoginPayload);

      // Assert
      expect(mockJWTService.sign).not.toHaveBeenCalled();
    });
  });
});
