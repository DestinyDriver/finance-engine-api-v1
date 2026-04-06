// tests/unit/transactionService.test.js
const { describe, it, expect, beforeEach } = require("@jest/globals");
require("dotenv").config();

jest.mock("../../src/utils/database", () => ({
  prisma: {
    transaction: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    category: { findUnique: jest.fn() },
  },
}));

jest.mock("../../src/utils/redis", () => ({
  invalidatePattern: jest.fn().mockResolvedValue(true),
}));

jest.mock("../../src/utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const { prisma } = require("../../src/utils/database");
const txService = require("../../src/services/transactionService");

const mockTx = {
  id: "tx-uuid",
  amount: 500.0,
  type: "INCOME",
  description: "Salary",
  date: new Date("2024-01-01"),
  category: { id: "cat-1", name: "Salary", color: "#10B981" },
  user: {
    id: "user-1",
    firstName: "Test",
    lastName: "User",
    email: "test@test.com",
  },
};

describe("TransactionService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getTransactions", () => {
    it("should return paginated transactions for VIEWER (own only)", async () => {
      prisma.transaction.findMany.mockResolvedValue([mockTx]);
      prisma.transaction.count.mockResolvedValue(1);

      const result = await txService.getTransactions({}, "user-1", "VIEWER");

      expect(result.transactions).toHaveLength(1);
      expect(result.total).toBe(1);
      // Verify it scopes to user
      const whereArg = prisma.transaction.findMany.mock.calls[0][0].where;
      expect(whereArg.userId).toBe("user-1");
    });

    it("should NOT scope by userId for ADMIN", async () => {
      prisma.transaction.findMany.mockResolvedValue([mockTx]);
      prisma.transaction.count.mockResolvedValue(10);

      await txService.getTransactions({}, "admin-1", "ADMIN");

      const whereArg = prisma.transaction.findMany.mock.calls[0][0].where;
      expect(whereArg.userId).toBeUndefined();
    });
  });

  describe("createTransaction", () => {
    it("should create a transaction with valid data", async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: "cat-1",
        name: "Salary",
      });
      prisma.transaction.create.mockResolvedValue(mockTx);

      const result = await txService.createTransaction(
        {
          amount: 500,
          type: "INCOME",
          categoryId: "cat-1",
          date: "2024-01-01",
        },
        "user-1",
      );

      expect(result).toEqual(mockTx);
      expect(prisma.transaction.create).toHaveBeenCalledTimes(1);
    });

    it("should throw 404 if category does not exist", async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(
        txService.createTransaction(
          {
            amount: 500,
            type: "INCOME",
            categoryId: "bad-cat-id",
            date: "2024-01-01",
          },
          "user-1",
        ),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe("deleteTransaction", () => {
    it("should soft-delete (set deletedAt) instead of hard-delete", async () => {
      prisma.transaction.findFirst.mockResolvedValue(mockTx);
      prisma.transaction.update.mockResolvedValue({
        ...mockTx,
        deletedAt: new Date(),
      });

      await txService.deleteTransaction("tx-uuid", "user-1", "ADMIN");

      const updateCall = prisma.transaction.update.mock.calls[0][0];
      expect(updateCall.data.deletedAt).toBeDefined();
      // Ensure it's NOT using delete
      expect(prisma.transaction.delete).toBeUndefined();
    });

    it("should throw 404 for non-existent transaction", async () => {
      prisma.transaction.findFirst.mockResolvedValue(null);

      await expect(
        txService.deleteTransaction("bad-id", "user-1", "ADMIN"),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("should prevent VIEWER from accessing other users transactions", async () => {
      prisma.transaction.findFirst.mockResolvedValue(null); // not found when scoped to user

      await expect(
        txService.deleteTransaction("tx-uuid", "different-user", "VIEWER"),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });
});
