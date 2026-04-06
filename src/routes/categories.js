// src/routes/categories.js
const express = require("express");
const categoryController = require("../controllers/categoryController");
const {
  createCategoryValidator,
  uuidParamValidator,
} = require("../validators");
const { authenticate, requireRole } = require("../middleware/auth");
const validateMiddleware = require("../middleware/validate");

const router = express.Router();

/**
 * @swagger
 * /api/v1/categories:
 *   get:
 *     tags: [Categories]
 *     summary: Get all categories
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all categories
 */
router.get("/", authenticate, categoryController.getCategories);

/**
 * @swagger
 * /api/v1/categories:
 *   post:
 *     tags: [Categories]
 *     summary: Create a new category
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, maxLength: 50 }
 *               description: { type: string, maxLength: 255 }
 *               color: { type: string, pattern: '^#[0-9A-Fa-f]{6}$' }
 *     responses:
 *       201:
 *         description: Category created
 *       422:
 *         description: Validation failed
 */
router.post(
  "/",
  authenticate,
  requireRole("ADMIN"),
  createCategoryValidator,
  validateMiddleware,
  categoryController.createCategory,
);

/**
 * @swagger
 * /api/v1/categories/{id}:
 *   put:
 *     tags: [Categories]
 *     summary: Update category
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
 *               name: { type: string, maxLength: 50 }
 *               description: { type: string, maxLength: 255 }
 *               color: { type: string, pattern: '^#[0-9A-Fa-f]{6}$' }
 *     responses:
 *       200:
 *         description: Category updated
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Category not found
 */
router.put(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  uuidParamValidator,
  validateMiddleware,
  categoryController.updateCategory,
);

/**
 * @swagger
 * /api/v1/categories/{id}:
 *   delete:
 *     tags: [Categories]
 *     summary: Delete category (only if no active transactions)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Category deleted
 *       400:
 *         description: Cannot delete category with active transactions
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Category not found
 */
router.delete(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  uuidParamValidator,
  validateMiddleware,
  categoryController.deleteCategory,
);

module.exports = router;
