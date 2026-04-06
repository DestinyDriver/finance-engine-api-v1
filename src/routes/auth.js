const express = require("express");
const { validationResult } = require("express-validator");
const authController = require("../controllers/authController");
const {
  registerValidator,
  loginValidator,
  refreshValidator,
  changePasswordValidator,
} = require("../validators");
const { authenticate } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimiter");
const validateMiddleware = require("../middleware/validate");

const router = express.Router();

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, format: password }
 *               firstName: { type: string }
 *               lastName: { type: string }
 *     responses:
 *       201:
 *         description: User registered successfully
 *       409:
 *         description: Email already exists
 *       422:
 *         description: Validation failed
 */
router.post(
  "/register",
  authLimiter,
  registerValidator,
  validateMiddleware,
  authController.register,
);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post(
  "/login",
  authLimiter,
  loginValidator,
  validateMiddleware,
  authController.login,
);

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token using refresh token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: New access token issued
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post(
  "/refresh",
  refreshValidator,
  validateMiddleware,
  authController.refresh,
);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout (blacklist refresh token)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Unauthorized
 */
router.post("/logout", authenticate, authController.logout);

/**
 * @swagger
 * /api/v1/auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Change password (revokes all tokens)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string }
 *     responses:
 *       200:
 *         description: Password changed, all sessions revoked
 *       401:
 *         description: Current password incorrect
 */
router.post(
  "/change-password",
  authenticate,
  changePasswordValidator,
  validateMiddleware,
  authController.changePassword,
);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *       401:
 *         description: Unauthorized
 */
router.get("/me", authenticate, authController.me);

module.exports = router;
