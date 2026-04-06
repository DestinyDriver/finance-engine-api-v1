const express = require("express");
const { body, param } = require("express-validator");
const transactionController = require("../controllers/transactionController");
const {
  createTransactionValidator,
  updateTransactionValidator,
  transactionListValidator,
  uuidParamValidator,
} = require("../validators");
const { authenticate, requireRole } = require("../middleware/auth");
const validateMiddleware = require("../middleware/validate");

const router = express.Router();

/**
 * @swagger
 * /api/v1/transactions:
 *   get:
 *     tags: [Transactions]
 *     summary: Get transactions (paginated, filtered)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [INCOME, EXPENSE] }
 *       - in: query
 *         name: categoryId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: amountMin
 *         schema: { type: number }
 *       - in: query
 *         name: amountMax
 *         schema: { type: number }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [date, amount, createdAt] }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc] }
 *     responses:
 *       200:
 *         description: Paginated transaction list
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/",
  authenticate,
  transactionListValidator,
  validateMiddleware,
  transactionController.getTransactions,
);

/**
 * @swagger
 * /api/v1/transactions/{id}:
 *   get:
 *     tags: [Transactions]
 *     summary: Get transaction by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Transaction details
 *       404:
 *         description: Transaction not found
 */
router.get(
  "/:id",
  authenticate,
  uuidParamValidator,
  validateMiddleware,
  transactionController.getTransactionById,
);

/**
 * @swagger
 * /api/v1/transactions:
 *   post:
 *     tags: [Transactions]
 *     summary: Create a new transaction
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, type, categoryId, date]
 *             properties:
 *               amount: { type: number, minimum: 0.01 }
 *               type: { type: string, enum: [INCOME, EXPENSE] }
 *               categoryId: { type: string, format: uuid }
 *               date: { type: string, format: date-time }
 *               description: { type: string, maxLength: 255 }
 *               notes: { type: string, maxLength: 1000 }
 *     responses:
 *       201:
 *         description: Transaction created
 *       422:
 *         description: Validation failed
 */
router.post(
  "/",
  authenticate,
  createTransactionValidator,
  validateMiddleware,
  transactionController.createTransaction,
);

/**
 * @swagger
 * /api/v1/transactions/{id}:
 *   put:
 *     tags: [Transactions]
 *     summary: Update transaction
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount: { type: number, minimum: 0.01 }
 *               type: { type: string, enum: [INCOME, EXPENSE] }
 *               categoryId: { type: string, format: uuid }
 *               date: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Transaction updated
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Transaction not found
 */
router.put(
  "/:id",
  authenticate,
  updateTransactionValidator,
  validateMiddleware,
  transactionController.updateTransaction,
);

/**
 * @swagger
 * /api/v1/transactions/{id}:
 *   delete:
 *     tags: [Transactions]
 *     summary: Delete transaction (soft-delete)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Transaction deleted
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Transaction not found
 */
router.delete(
  "/:id",
  authenticate,
  uuidParamValidator,
  validateMiddleware,
  transactionController.deleteTransaction,
);

module.exports = router;

router.get(
  "/:id",
  authenticate,
  requireRole("ADMIN", "ANALYST", "VIEWER"),
  [param("id").isInt().withMessage("Transaction id must be an integer")],
  validateMiddleware,
  transactionController.getTransactionById,
);

router.patch(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  [
    param("id").isInt().withMessage("Transaction id must be an integer"),
    body("amount").optional().isFloat({ gt: 0 }),
    body("type").optional().isIn(["INCOME", "EXPENSE"]),
    body("categoryId").optional().isInt(),
    body("date").optional().isISO8601(),
  ],
  validateMiddleware,
  transactionController.updateTransaction,
);

router.delete(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  [param("id").isInt().withMessage("Transaction id must be an integer")],
  validateMiddleware,
  transactionController.deleteTransaction,
);

module.exports = router;
