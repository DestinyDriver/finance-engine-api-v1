// src/routes/dashboard.js
const express = require("express");
const dashboardController = require("../controllers/dashboardController");
const {
  dateRangeValidator,
  monthsValidator,
  weeksValidator,
} = require("../validators");
const { authenticate, requireRole } = require("../middleware/auth");
const validateMiddleware = require("../middleware/validate");

const router = express.Router();

/**
 * @swagger
 * /api/v1/dashboard/overview:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get complete dashboard overview
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Full dashboard data
 */
router.get("/overview", authenticate, dashboardController.getOverview);

/**
 * @swagger
 * /api/v1/dashboard/summary:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get income/expense summary for date range
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Summary data (total income, expense, net)
 */
router.get(
  "/summary",
  authenticate,
  dateRangeValidator,
  validateMiddleware,
  dashboardController.getSummary,
);

/**
 * @swagger
 * /api/v1/dashboard/category-breakdown:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get transactions grouped by category
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [INCOME, EXPENSE] }
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Category breakdown with amounts and percentages
 */
router.get(
  "/category-breakdown",
  authenticate,
  dateRangeValidator,
  validateMiddleware,
  dashboardController.getCategoryBreakdown,
);

/**
 * @swagger
 * /api/v1/dashboard/monthly-trends:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get income/expense trends by month (6 months default)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: months
 *         schema: { type: integer, minimum: 1, maximum: 24 }
 *     responses:
 *       200:
 *         description: Monthly trend data
 */
router.get(
  "/monthly-trends",
  authenticate,
  monthsValidator,
  validateMiddleware,
  dashboardController.getMonthlyTrends,
);

/**
 * @swagger
 * /api/v1/dashboard/weekly-trends:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get income/expense trends by week (8 weeks default)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: weeks
 *         schema: { type: integer, minimum: 1, maximum: 52 }
 *     responses:
 *       200:
 *         description: Weekly trend data
 */
router.get(
  "/weekly-trends",
  authenticate,
  weeksValidator,
  validateMiddleware,
  dashboardController.getWeeklyTrends,
);

/**
 * @swagger
 * /api/v1/dashboard/recent-activity:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get recent transactions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recent transactions (10 by default)
 */
router.get(
  "/recent-activity",
  authenticate,
  dashboardController.getRecentActivity,
);

/**
 * @swagger\n * /api/v1/dashboard/top-categories:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get top categories by transaction amount
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [INCOME, EXPENSE] }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *     responses:
 *       200:
 *         description: Top categories
 */
router.get(
  "/top-categories",
  authenticate,
  dashboardController.getTopCategories,
);

module.exports = router;
