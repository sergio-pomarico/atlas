import type { UserEntity } from "@atlas/entities/user.ts";
import { UserStatus } from "@atlas/entities/user.ts";
import { describe, expect, it } from "@jest/globals";
import { User } from "@modules/auth/domain/user.ts";

describe("User Domain Entity", () => {
  const mockUserData: UserEntity = {
    id: "user-123",
    email: "test@example.com",
    phone: 3_014_345_345,
    password: "hashedPassword123",
    verified: true,
    status: UserStatus.ACTIVE,
    failedLoginAttempts: 0,
    createdAt: new Date("2023-01-01"),
    updatedAt: new Date("2023-01-01"),
  };

  describe("User Creation", () => {
    it("should create a user with valid data", () => {
      const user = new User(mockUserData);

      expect(user.id).toBe(mockUserData.id);
      expect(user.email).toBe(mockUserData.email);
      expect(user.phone).toBe(mockUserData.phone);
      expect(user.isVerified()).toBe(true);
      expect(user.isBlocked()).toBe(false);
    });

    it("should set default values for optional fields", () => {
      const minimalUserData = {
        ...mockUserData,
        verified: undefined,
        createdAt: undefined,
        updatedAt: undefined,
      };

      const user = new User(minimalUserData as UserEntity);

      expect(user.isVerified()).toBe(false);
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe("Failed Login Attempts", () => {
    it("should increment failed login attempts", () => {
      const user = new User(mockUserData);

      user.incrementFailedLoginAttempts();

      expect(user.toObject().failedLoginAttempts).toBe(1);
    });

    it("should block user after 5 failed attempts", () => {
      const user = new User(mockUserData);

      // Simulate 5 failed attempts
      for (let i = 0; i < 5; i++) {
        user.incrementFailedLoginAttempts();
      }

      expect(user.isBlocked()).toBe(true);
      expect(user.toObject().status).toBe(UserStatus.BLOCKED);
    });

    it("should reset failed login attempts", () => {
      const user = new User({
        ...mockUserData,
        failedLoginAttempts: 3,
      });

      user.resetFailedLoginAttempts();

      expect(user.toObject().failedLoginAttempts).toBe(0);
    });
  });

  describe("User Status Checks", () => {
    it("should correctly identify blocked users", () => {
      const blockedUser = new User({
        ...mockUserData,
        status: UserStatus.BLOCKED,
      });

      expect(blockedUser.isBlocked()).toBe(true);
    });

    it("should correctly identify unverified users", () => {
      const unverifiedUser = new User({
        ...mockUserData,
        verified: false,
      });

      expect(unverifiedUser.isVerified()).toBe(false);
    });
  });
});
