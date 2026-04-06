// src/validators/index.js
const { body, query, param } = require("express-validator");

// ─── Auth ────────────────────────────────────────────────────────────────────
const registerValidator = [
  body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage(
      "Password must contain uppercase, lowercase, number and special character",
    ),
  body("firstName")
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("First name required (max 50 chars)"),
  body("lastName")
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Last name required (max 50 chars)"),
  body("role")
    .optional()
    .isIn(["VIEWER", "ANALYST", "ADMIN"])
    .withMessage("Invalid role"),
];

const loginValidator = [
  body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
  body("password").notEmpty().withMessage("Password required"),
];

const refreshValidator = [
  body("refreshToken").notEmpty().withMessage("Refresh token required"),
];

const changePasswordValidator = [
  body("currentPassword").notEmpty().withMessage("Current password required"),
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage(
      "Password must contain uppercase, lowercase, number and special character",
    ),
];

// ─── Users ────────────────────────────────────────────────────────────────────
const updateUserValidator = [
  param("id").isUUID().withMessage("Invalid user ID"),
  body("firstName").optional().trim().isLength({ min: 1, max: 50 }),
  body("lastName").optional().trim().isLength({ min: 1, max: 50 }),
  body("email").optional().isEmail().normalizeEmail(),
  body("role").optional().isIn(["VIEWER", "ANALYST", "ADMIN"]),
  body("status").optional().isIn(["ACTIVE", "INACTIVE", "SUSPENDED"]),
];

const userStatusValidator = [
  param("id").isUUID().withMessage("Invalid user ID"),
  body("status")
    .isIn(["ACTIVE", "INACTIVE", "SUSPENDED"])
    .withMessage("Invalid status"),
];

const userListValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be 1-100"),
  query("role").optional().isIn(["VIEWER", "ANALYST", "ADMIN"]),
  query("status").optional().isIn(["ACTIVE", "INACTIVE", "SUSPENDED"]),
  query("sortBy")
    .optional()
    .isIn(["createdAt", "email", "firstName", "lastName"]),
  query("sortOrder").optional().isIn(["asc", "desc"]),
];

// ─── Transactions ────────────────────────────────────────────────────────────
const createTransactionValidator = [
  body("amount")
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be a positive number"),
  body("type")
    .isIn(["INCOME", "EXPENSE"])
    .withMessage("Type must be INCOME or EXPENSE"),
  body("categoryId").isUUID().withMessage("Valid category ID required"),
  body("date").isISO8601().withMessage("Valid ISO date required"),
  body("description").optional().trim().isLength({ max: 255 }),
  body("notes").optional().trim().isLength({ max: 1000 }),
];

const updateTransactionValidator = [
  param("id").isUUID().withMessage("Invalid transaction ID"),
  body("amount")
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be positive"),
  body("type").optional().isIn(["INCOME", "EXPENSE"]),
  body("categoryId").optional().isUUID(),
  body("date").optional().isISO8601(),
  body("description").optional().trim().isLength({ max: 255 }),
  body("notes").optional().trim().isLength({ max: 1000 }),
];

const transactionListValidator = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("type").optional().isIn(["INCOME", "EXPENSE"]),
  query("categoryId").optional().isUUID(),
  query("dateFrom").optional().isISO8601(),
  query("dateTo").optional().isISO8601(),
  query("amountMin").optional().isFloat({ min: 0 }),
  query("amountMax").optional().isFloat({ min: 0 }),
  query("sortBy").optional().isIn(["date", "amount", "createdAt"]),
  query("sortOrder").optional().isIn(["asc", "desc"]),
];

// ─── Dashboard ────────────────────────────────────────────────────────────────
const dateRangeValidator = [
  query("dateFrom")
    .optional()
    .isISO8601()
    .withMessage("Invalid dateFrom format"),
  query("dateTo").optional().isISO8601().withMessage("Invalid dateTo format"),
];

const monthsValidator = [
  query("months")
    .optional()
    .isInt({ min: 1, max: 24 })
    .withMessage("months must be 1-24"),
];

const weeksValidator = [
  query("weeks")
    .optional()
    .isInt({ min: 1, max: 52 })
    .withMessage("weeks must be 1-52"),
];

// ─── Categories ───────────────────────────────────────────────────────────────
const createCategoryValidator = [
  body("name")
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Category name required (max 50)"),
  body("description").optional().trim().isLength({ max: 255 }),
  body("color")
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage("Color must be a valid hex color"),
];

const uuidParamValidator = [
  param("id").isUUID().withMessage("Invalid ID format"),
];

module.exports = {
  registerValidator,
  loginValidator,
  refreshValidator,
  changePasswordValidator,
  updateUserValidator,
  userStatusValidator,
  userListValidator,
  createTransactionValidator,
  updateTransactionValidator,
  transactionListValidator,
  dateRangeValidator,
  monthsValidator,
  weeksValidator,
  createCategoryValidator,
  uuidParamValidator,
};
