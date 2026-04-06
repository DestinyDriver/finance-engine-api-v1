// src/middleware/auth.js
const jwt = require("jsonwebtoken");
const { prisma } = require("../utils/database");
const { redis } = require("../utils/redis");
const logger = require("../utils/logger");

const ROLES = {
  VIEWER: "VIEWER",
  ANALYST: "ANALYST",
  ADMIN: "ADMIN",
};

const ROLES_HIERARCHY = {
  VIEWER: 0,
  ANALYST: 1,
  ADMIN: 2,
};

/**
 * Verify JWT token and attach user to req.user
 * Check blacklist and verify user is active
 */
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "No token provided" });
    }

    // Check if token is blacklisted
    const blacklisted = await redis.get(`token:blacklist:${token}`);
    if (blacklisted) {
      return res
        .status(401)
        .json({ success: false, message: "Token has been revoked" });
    }

    // Verify JWT signature
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Check cache first
    let user = await redis.get(`user:${decoded.userId}`);
    if (user) {
      user = JSON.parse(user);
    } else {
      // Fetch from database if not in cache
      user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (user) {
        // Cache for 5 minutes
        await redis.setex(`user:${decoded.userId}`, 300, JSON.stringify(user));
      }
    }

    if (!user || user.status === "INACTIVE") {
      return res
        .status(401)
        .json({ success: false, message: "User not found or inactive" });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Token expired" });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
    logger.error("Auth middleware error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Authentication failed" });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuthenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (token) {
      const blacklisted = await redis.get(`token:blacklist:${token}`);
      if (!blacklisted) {
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        let user = await redis.get(`user:${decoded.userId}`);
        if (user) {
          user = JSON.parse(user);
        } else {
          user = await prisma.user.findUnique({
            where: { id: decoded.userId },
          });
          if (user) {
            await redis.setex(
              `user:${decoded.userId}`,
              300,
              JSON.stringify(user),
            );
          }
        }
        if (user && user.status === "ACTIVE") {
          req.user = user;
        }
      }
    }
    next();
  } catch (error) {
    logger.debug("Optional auth error (non-critical):", error.message);
    next(); // Continue without user
  }
};

/**
 * Role-based access control middleware factory
 * Usage: requireRole(ROLES.ADMIN, ROLES.ANALYST)
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const userRoleLevel = ROLES_HIERARCHY[req.user.role] ?? -1;
    const minRequiredLevel = Math.min(
      ...allowedRoles.map((role) => ROLES_HIERARCHY[role] ?? -1),
    );

    if (userRoleLevel < minRequiredLevel) {
      return res
        .status(403)
        .json({ success: false, message: "Insufficient permissions" });
    }

    next();
  };
};

/**
 * Shorthand role guards
 */
const isAdmin = requireRole(ROLES.ADMIN);
const isAnalystOrAbove = requireRole(ROLES.ANALYST, ROLES.ADMIN);
const isViewerOrAbove = requireRole(ROLES.VIEWER, ROLES.ANALYST, ROLES.ADMIN);

module.exports = {
  authenticate,
  optionalAuthenticate,
  requireRole,
  isAdmin,
  isAnalystOrAbove,
  isViewerOrAbove,
  ROLES,
  ROLES_HIERARCHY,
};
