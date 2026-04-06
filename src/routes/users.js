// src/routes/users.js
const express = require("express");
const userController = require("../controllers/userController");
const {
  updateUserValidator,
  userStatusValidator,
  userListValidator,
  uuidParamValidator,
} = require("../validators");
const { authenticate, requireRole } = require("../middleware/auth");
const validateMiddleware = require("../middleware/validate");

const router = express.Router();

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     tags: [Users]
 *     summary: Get all users (Admin only)
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
 *         name: role
 *         schema: { type: string, enum: [VIEWER, ANALYST, ADMIN] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [ACTIVE, INACTIVE, SUSPENDED] }
 *     responses:
 *       200:
 *         description: Paginated user list
 *       403:
 *         description: Forbidden (requires ADMIN)
 */
router.get(
  "/",
  authenticate,
  requireRole("ADMIN"),
  userListValidator,
  validateMiddleware,
  userController.getUsers,
);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: User details
 *       404:
 *         description: User not found
 */
router.get(
  "/:id",
  authenticate,
  uuidParamValidator,
  validateMiddleware,
  userController.getUserById,
);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Update user
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
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               email: { type: string, format: email }
 *               role: { type: string, enum: [VIEWER, ANALYST, ADMIN] }
 *     responses:
 *       200:
 *         description: User updated
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.put(
  "/:id",
  authenticate,
  updateUserValidator,
  validateMiddleware,
  userController.updateUser,
);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Delete user (soft-delete)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: User deleted
 *       403:
 *         description: Forbidden (requires ADMIN)
 *       404:
 *         description: User not found
 */
router.delete(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  uuidParamValidator,
  validateMiddleware,
  userController.deleteUser,
);

/**
 * @swagger
 * /api/v1/users/{id}/status:
 *   patch:
 *     tags: [Users]
 *     summary: Update user status
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
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [ACTIVE, INACTIVE, SUSPENDED] }
 *     responses:
 *       200:
 *         description: Status updated
 *       403:
 *         description: Forbidden
 */
router.patch(
  "/:id/status",
  authenticate,
  requireRole("ADMIN"),
  userStatusValidator,
  validateMiddleware,
  userController.updateUserStatus,
);

module.exports = router;
