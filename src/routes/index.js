const express = require("express");
const authRoutes = require("./auth");
const userRoutes = require("./users");
const transactionRoutes = require("./transactions");
const dashboardRoutes = require("./dashboard");
const categoryRoutes = require("./categories");

const router = express.Router();

/**
 * @swagger
 * /api-docs:
 *   get:
 *     tags: [API Docs]
 *     summary: Swagger UI Documentation
 *     responses:
 *       200:
 *         description: Interactive API documentation
 */

// Mount route modules
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/transactions", transactionRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/categories", categoryRoutes);

module.exports = router;
