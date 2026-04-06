const { prisma } = require("../utils/database");
const { invalidatePattern } = require("../utils/redis");
const logger = require("../utils/logger");

const TX_SELECT = {
  id: true,
  amount: true,
  type: true,
  description: true,
  notes: true,
  date: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true, color: true } },
  user: { select: { id: true, firstName: true, lastName: true, email: true } },
};

/**
 * Build dynamic WHERE clause from filter params
 */
const buildWhereClause = (filters, userId, userRole) => {
  const where = { deletedAt: null };

  // Non-admins can only see their own transactions
  if (userRole !== "ADMIN") {
    where.userId = userId;
  } else if (filters.userId) {
    where.userId = filters.userId;
  }

  if (filters.type) where.type = filters.type;
  if (filters.categoryId) where.categoryId = filters.categoryId;

  if (filters.dateFrom || filters.dateTo) {
    where.date = {};
    if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.date.lte = new Date(filters.dateTo);
  }

  if (filters.amountMin || filters.amountMax) {
    where.amount = {};
    if (filters.amountMin) where.amount.gte = parseFloat(filters.amountMin);
    if (filters.amountMax) where.amount.lte = parseFloat(filters.amountMax);
  }

  if (filters.search) {
    where.OR = [
      { description: { contains: filters.search, mode: "insensitive" } },
      { notes: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return where;
};

/**
 * List transactions with full filtering, pagination, sorting
 */
const getTransactions = async (filters, userId, userRole) => {
  const page = Math.max(1, parseInt(filters.page) || 1);
  const limit = Math.min(
    parseInt(filters.limit) || parseInt(process.env.DEFAULT_PAGE_SIZE || 20),
    parseInt(process.env.MAX_PAGE_SIZE || 100),
  );
  const skip = (page - 1) * limit;
  const sortBy = ["date", "amount", "createdAt"].includes(filters.sortBy)
    ? filters.sortBy
    : "date";
  const sortOrder = filters.sortOrder === "asc" ? "asc" : "desc";

  const where = buildWhereClause(filters, userId, userRole);

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      select: TX_SELECT,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.transaction.count({ where }),
  ]);

  return { transactions, total, page, limit };
};

/**
 * Get a single transaction by ID
 */
const getTransactionById = async (id, userId, userRole) => {
  const where = { id, deletedAt: null };
  if (userRole !== "ADMIN") where.userId = userId;

  const tx = await prisma.transaction.findFirst({ where, select: TX_SELECT });
  if (!tx) {
    const err = new Error("Transaction not found");
    err.statusCode = 404;
    throw err;
  }

  return tx;
};

/**
 * Create a new transaction
 */
const createTransaction = async (data, userId) => {
  const category = await prisma.category.findUnique({
    where: { id: data.categoryId },
  });
  if (!category) {
    const err = new Error("Category not found");
    err.statusCode = 404;
    throw err;
  }

  const tx = await prisma.transaction.create({
    data: {
      amount: parseFloat(data.amount),
      type: data.type,
      description: data.description || null,
      notes: data.notes || null,
      date: new Date(data.date),
      categoryId: data.categoryId,
      userId,
    },
    select: TX_SELECT,
  });

  // Invalidate dashboard caches
  await invalidatePattern(`dashboard:*`);
  logger.info("Transaction created", {
    transactionId: tx.id,
    userId,
    amount: tx.amount,
    type: tx.type,
  });

  return tx;
};

/**
 * Update an existing transaction
 */
const updateTransaction = async (id, data, userId, userRole) => {
  const where = { id, deletedAt: null };
  if (userRole !== "ADMIN") where.userId = userId;

  const existing = await prisma.transaction.findFirst({ where });
  if (!existing) {
    const err = new Error("Transaction not found");
    err.statusCode = 404;
    throw err;
  }

  if (data.categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });
    if (!category) {
      const err = new Error("Category not found");
      err.statusCode = 404;
      throw err;
    }
  }

  const updated = await prisma.transaction.update({
    where: { id },
    data: {
      ...(data.amount !== undefined && { amount: parseFloat(data.amount) }),
      ...(data.type && { type: data.type }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.date && { date: new Date(data.date) }),
      ...(data.categoryId && { categoryId: data.categoryId }),
    },
    select: TX_SELECT,
  });

  await invalidatePattern(`dashboard:*`);
  logger.info("Transaction updated", {
    transactionId: id,
    userId,
    fields: Object.keys(data),
  });

  return updated;
};

/**
 * Soft-delete a transaction
 */
const deleteTransaction = async (id, userId, userRole) => {
  const where = { id, deletedAt: null };
  if (userRole !== "ADMIN") where.userId = userId;

  const existing = await prisma.transaction.findFirst({ where });
  if (!existing) {
    const err = new Error("Transaction not found");
    err.statusCode = 404;
    throw err;
  }

  await prisma.transaction.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await invalidatePattern(`dashboard:*`);
  logger.info("Transaction soft-deleted", {
    transactionId: id,
    deletedBy: userId,
  });
};

module.exports = {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
};

exports.createTransaction = async (data) => {
  const category = await prisma.category.findUnique({
    where: { id: data.categoryId },
  });
  if (!category) {
    const err = new Error("Category not found");
    err.statusCode = 404;
    throw err;
  }

  return prisma.transaction.create({
    data: {
      amount: Number(data.amount),
      type: data.type,
      description: data.description || "",
      date: new Date(data.date),
      category: { connect: { id: data.categoryId } },
      user: { connect: { id: data.userId } },
    },
    include: { category: true, user: { select: { id: true, email: true } } },
  });
};

exports.getTransactionById = async (id) => {
  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: { category: true, user: { select: { id: true, email: true } } },
  });
  if (!transaction) {
    const err = new Error("Transaction not found");
    err.statusCode = 404;
    throw err;
  }
  return transaction;
};

exports.updateTransaction = async (id, data) => {
  if (data.categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });
    if (!category) {
      const err = new Error("Category not found");
      err.statusCode = 404;
      throw err;
    }
  }

  return prisma.transaction.update({
    where: { id },
    data: {
      amount: data.amount !== undefined ? Number(data.amount) : undefined,
      type: data.type,
      description: data.description,
      date: data.date ? new Date(data.date) : undefined,
      category: data.categoryId
        ? { connect: { id: data.categoryId } }
        : undefined,
    },
    include: { category: true, user: { select: { id: true, email: true } } },
  });
};

exports.deleteTransaction = async (id) => {
  await prisma.transaction.delete({ where: { id } });
};
