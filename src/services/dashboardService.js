// src/services/dashboardService.js
const { prisma } = require("../utils/database");
const { cacheGetOrSet } = require("../utils/redis");
const logger = require("../utils/logger");

const SUMMARY_TTL = parseInt(process.env.CACHE_TTL_SUMMARY || 300);
const TRENDS_TTL = parseInt(process.env.CACHE_TTL_TRENDS || 600);

/**
 * Build user-scoped WHERE clause
 */
const userScope = (userId, userRole) =>
  userRole === "ADMIN" ? { deletedAt: null } : { userId, deletedAt: null };

/**
 * Overall financial summary (total income, expenses, net balance)
 */
const getSummary = async (userId, userRole, { dateFrom, dateTo } = {}) => {
  const cacheKey = `dashboard:summary:${userRole === "ADMIN" ? "all" : userId}:${dateFrom || ""}:${dateTo || ""}`;

  return cacheGetOrSet(cacheKey, SUMMARY_TTL, async () => {
    const where = {
      ...userScope(userId, userRole),
      ...(dateFrom || dateTo
        ? {
            date: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(dateTo) }),
            },
          }
        : {}),
    };

    const [income, expense, transactionCount] = await Promise.all([
      prisma.transaction.aggregate({
        where: { ...where, type: "INCOME" },
        _sum: { amount: true },
        _count: true,
        _avg: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { ...where, type: "EXPENSE" },
        _sum: { amount: true },
        _count: true,
        _avg: { amount: true },
      }),
      prisma.transaction.count({ where }),
    ]);

    const totalIncome = parseFloat(income._sum.amount || 0);
    const totalExpense = parseFloat(expense._sum.amount || 0);

    return {
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      savingsRate:
        totalIncome > 0
          ? (((totalIncome - totalExpense) / totalIncome) * 100).toFixed(2)
          : 0,
      transactionCount,
      incomeCount: income._count,
      expenseCount: expense._count,
      avgIncome: parseFloat(income._avg.amount || 0),
      avgExpense: parseFloat(expense._avg.amount || 0),
    };
  });
};

/**
 * Category-wise breakdown with percentages
 */
const getCategoryBreakdown = async (
  userId,
  userRole,
  { type, dateFrom, dateTo } = {},
) => {
  const cacheKey = `dashboard:categories:${userRole === "ADMIN" ? "all" : userId}:${type || "all"}:${dateFrom || ""}:${dateTo || ""}`;

  return cacheGetOrSet(cacheKey, SUMMARY_TTL, async () => {
    const where = {
      ...userScope(userId, userRole),
      ...(type && { type }),
      ...(dateFrom || dateTo
        ? {
            date: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(dateTo) }),
            },
          }
        : {}),
    };

    const raw = await prisma.transaction.groupBy({
      by: ["categoryId", "type"],
      where,
      _sum: { amount: true },
      _count: true,
    });

    // Fetch category names
    const categoryIds = [...new Set(raw.map((r) => r.categoryId))];
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, color: true },
    });
    const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

    // Calculate totals per type for percentages
    const typeTotals = {};
    raw.forEach((r) => {
      typeTotals[r.type] =
        (typeTotals[r.type] || 0) + parseFloat(r._sum.amount || 0);
    });

    const breakdown = raw.map((r) => {
      const total = parseFloat(r._sum.amount || 0);
      const cat = catMap[r.categoryId];
      return {
        categoryId: r.categoryId,
        categoryName: cat?.name || "Unknown",
        categoryColor: cat?.color || "#6366F1",
        type: r.type,
        total,
        count: r._count,
        percentage:
          typeTotals[r.type] > 0
            ? ((total / typeTotals[r.type]) * 100).toFixed(2)
            : 0,
      };
    });

    return breakdown.sort((a, b) => b.total - a.total);
  });
};

/**
 * Monthly trends over the past N months
 */
const getMonthlyTrends = async (userId, userRole, { months = 6 } = {}) => {
  const cacheKey = `dashboard:monthly:${userRole === "ADMIN" ? "all" : userId}:${months}`;

  return cacheGetOrSet(cacheKey, TRENDS_TTL, async () => {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - (months - 1));
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const where = {
      ...userScope(userId, userRole),
      date: { gte: startDate },
    };

    // Use raw query for efficient month grouping in PostgreSQL
    const rows = await prisma.$queryRaw`
      SELECT
        DATE_TRUNC('month', date) AS month,
        type,
        SUM(amount) AS total,
        COUNT(*) AS count
      FROM transactions
      WHERE
        "deletedAt" IS NULL
        ${userRole !== "ADMIN" ? prisma.$queryRaw`AND "userId" = ${userId}::uuid` : prisma.$queryRaw``}
        AND date >= ${startDate}
      GROUP BY DATE_TRUNC('month', date), type
      ORDER BY month ASC, type ASC
    `;

    // Pivot into month-keyed objects
    const monthMap = {};
    rows.forEach((row) => {
      const key = row.month.toISOString().slice(0, 7); // YYYY-MM
      if (!monthMap[key]) {
        monthMap[key] = {
          month: key,
          income: 0,
          expense: 0,
          net: 0,
          incomeCount: 0,
          expenseCount: 0,
        };
      }
      const total = parseFloat(row.total);
      const count = parseInt(row.count);
      if (row.type === "INCOME") {
        monthMap[key].income = total;
        monthMap[key].incomeCount = count;
      } else {
        monthMap[key].expense = total;
        monthMap[key].expenseCount = count;
      }
    });

    // Fill in net and ensure all months are present
    const result = Object.values(monthMap).map((m) => ({
      ...m,
      net: parseFloat((m.income - m.expense).toFixed(2)),
    }));

    return result;
  });
};

/**
 * Weekly trends for the past N weeks
 */
const getWeeklyTrends = async (userId, userRole, { weeks = 8 } = {}) => {
  const cacheKey = `dashboard:weekly:${userRole === "ADMIN" ? "all" : userId}:${weeks}`;

  return cacheGetOrSet(cacheKey, TRENDS_TTL, async () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - weeks * 7);

    const where = {
      ...userScope(userId, userRole),
      date: { gte: startDate },
    };

    const rows = await prisma.$queryRaw`
      SELECT
        DATE_TRUNC('week', date) AS week,
        type,
        SUM(amount) AS total,
        COUNT(*) AS count
      FROM transactions
      WHERE
        "deletedAt" IS NULL
        ${userRole !== "ADMIN" ? prisma.$queryRaw`AND "userId" = ${userId}::uuid` : prisma.$queryRaw``}
        AND date >= ${startDate}
      GROUP BY DATE_TRUNC('week', date), type
      ORDER BY week ASC
    `;

    const weekMap = {};
    rows.forEach((row) => {
      const key = row.week.toISOString().slice(0, 10);
      if (!weekMap[key]) {
        weekMap[key] = { week: key, income: 0, expense: 0, net: 0 };
      }
      const total = parseFloat(row.total);
      if (row.type === "INCOME") weekMap[key].income = total;
      else weekMap[key].expense = total;
    });

    return Object.values(weekMap).map((w) => ({
      ...w,
      net: parseFloat((w.income - w.expense).toFixed(2)),
    }));
  });
};

/**
 * Recent activity feed (last N transactions)
 */
const getRecentActivity = async (userId, userRole, { limit = 10 } = {}) => {
  const cacheKey = `dashboard:recent:${userRole === "ADMIN" ? "all" : userId}:${limit}`;

  return cacheGetOrSet(cacheKey, 60, async () => {
    const where = userScope(userId, userRole);

    return prisma.transaction.findMany({
      where,
      select: {
        id: true,
        amount: true,
        type: true,
        description: true,
        date: true,
        createdAt: true,
        category: { select: { id: true, name: true, color: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(parseInt(limit), 50),
    });
  });
};

/**
 * Top spending categories
 */
const getTopCategories = async (
  userId,
  userRole,
  { type = "EXPENSE", limit = 5, dateFrom, dateTo } = {},
) => {
  const cacheKey = `dashboard:top-cats:${userRole === "ADMIN" ? "all" : userId}:${type}:${limit}:${dateFrom || ""}:${dateTo || ""}`;

  return cacheGetOrSet(cacheKey, SUMMARY_TTL, async () => {
    const where = {
      ...userScope(userId, userRole),
      type,
      ...(dateFrom || dateTo
        ? {
            date: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(dateTo) }),
            },
          }
        : {}),
    };

    const grouped = await prisma.transaction.groupBy({
      by: ["categoryId"],
      where,
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: "desc" } },
      take: parseInt(limit),
    });

    const categoryIds = grouped.map((g) => g.categoryId);
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, color: true },
    });
    const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

    return grouped.map((g) => ({
      categoryId: g.categoryId,
      categoryName: catMap[g.categoryId]?.name || "Unknown",
      categoryColor: catMap[g.categoryId]?.color || "#6366F1",
      total: parseFloat(g._sum.amount || 0),
      count: g._count,
    }));
  });
};

/**
 * Full dashboard overview — single endpoint for frontend
 */
const getDashboardOverview = async (userId, userRole) => {
  const [
    summary,
    categoryBreakdown,
    monthlyTrends,
    recentActivity,
    topExpenses,
  ] = await Promise.all([
    getSummary(userId, userRole),
    getCategoryBreakdown(userId, userRole),
    getMonthlyTrends(userId, userRole),
    getRecentActivity(userId, userRole),
    getTopCategories(userId, userRole, { type: "EXPENSE", limit: 5 }),
  ]);

  return {
    summary,
    categoryBreakdown,
    monthlyTrends,
    recentActivity,
    topExpenses,
    generatedAt: new Date().toISOString(),
  };
};

module.exports = {
  getSummary,
  getCategoryBreakdown,
  getMonthlyTrends,
  getWeeklyTrends,
  getRecentActivity,
  getTopCategories,
  getDashboardOverview,
};
