// tests/unit/authService.test.js
const { describe, it, expect, beforeEach } = require("@jest/globals");
require("dotenv").config();

// Mock dependencies before importing the service
jest.mock("../../src/utils/database", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("../../src/utils/redis", () => ({
  cacheSet: jest.fn().mockResolvedValue(true),
  cacheDel: jest.fn().mockResolvedValue(true),
  cacheGet: jest.fn().mockResolvedValue(null),
  invalidatePattern: jest.fn().mockResolvedValue(true),
}));

jest.mock("../../src/utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  withRequest: jest.fn().mockReturnThis(),
  audit: jest.fn(),
}));

const bcrypt = require("bcryptjs");
const { prisma } = require("../../src/utils/database");
const authService = require("../../src/services/authService");

describe("AuthService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Register ──────────────────────────────────────────────────────────────
  describe("register", () => {
    it("should create a new user successfully", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: "uuid-123",
        email: "test@test.com",
        firstName: "Test",
        lastName: "User",
        role: "VIEWER",
        status: "ACTIVE",
        createdAt: new Date(),
      });

      const result = await authService.register({
        email: "test@test.com",
        password: "Test@1234",
        firstName: "Test",
        lastName: "User",
      });

      expect(result.email).toBe("test@test.com");
      expect(prisma.user.create).toHaveBeenCalledTimes(1);
    });

    it("should throw 409 if email already exists", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: "existing-id",
        email: "test@test.com",
      });

      await expect(
        authService.register({
          email: "test@test.com",
          password: "Test@1234",
          firstName: "Test",
          lastName: "User",
        }),
      ).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  // ─── Login ─────────────────────────────────────────────────────────────────
  describe("login", () => {
    it("should return tokens for valid credentials", async () => {
      const hashed = await bcrypt.hash("Test@1234", 10);
      prisma.user.findUnique.mockResolvedValue({
        id: "uuid-123",
        email: "admin@test.com",
        password: hashed,
        firstName: "Admin",
        lastName: "User",
        role: "ADMIN",
        status: "ACTIVE",
        deletedAt: null,
      });
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await authService.login({
        email: "admin@test.com",
        password: "Test@1234",
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe("admin@test.com");
      expect(result.user.password).toBeUndefined(); // Should not expose password
    });

    it("should throw 401 for wrong password", async () => {
      const hashed = await bcrypt.hash("CorrectPassword@1", 10);
      prisma.user.findUnique.mockResolvedValue({
        id: "uuid-123",
        email: "test@test.com",
        password: hashed,
        status: "ACTIVE",
        deletedAt: null,
      });

      await expect(
        authService.login({
          email: "test@test.com",
          password: "WrongPassword@1",
        }),
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it("should throw 401 for non-existent user", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({ email: "ghost@test.com", password: "Test@1234" }),
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it("should throw 401 for inactive user", async () => {
      const hashed = await bcrypt.hash("Test@1234", 10);
      prisma.user.findUnique.mockResolvedValue({
        id: "uuid-123",
        email: "test@test.com",
        password: hashed,
        status: "INACTIVE",
        deletedAt: null,
      });

      await expect(
        authService.login({ email: "test@test.com", password: "Test@1234" }),
      ).rejects.toMatchObject({ statusCode: 401 });
    });
  });

  // ─── Change Password ───────────────────────────────────────────────────────
  describe("changePassword", () => {
    it("should throw 400 for wrong current password", async () => {
      const hashed = await bcrypt.hash("OldPassword@1", 10);
      prisma.user.findUnique.mockResolvedValue({
        id: "uuid-123",
        password: hashed,
      });

      await expect(
        authService.changePassword("uuid-123", "WrongOld@1", "NewPassword@1"),
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });
});
