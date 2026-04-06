// src/services/authService.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const { prisma } = require("../utils/database");
const { cacheSet, cacheDel, invalidatePattern } = require("../utils/redis");
const logger = require("../utils/logger");

const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";
const REFRESH_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Generate a signed access token (short-lived)
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      type: "access",
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN, issuer: "finance-dashboard" },
  );
};

/**
 * Generate a refresh token (long-lived, stored in DB)
 */
const generateRefreshToken = () => {
  return jwt.sign(
    { jti: uuidv4(), type: "refresh" },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN, issuer: "finance-dashboard" },
  );
};

/**
 * Register a new user
 */
const register = async ({
  email,
  password,
  firstName,
  lastName,
  role = "VIEWER",
}) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const err = new Error("Email is already registered");
    err.statusCode = 409;
    throw err;
  }

  const hashedPassword = await bcrypt.hash(
    password,
    parseInt(process.env.BCRYPT_ROUNDS || 12),
  );

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role,
      status: "ACTIVE",
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  logger.info("User registered", {
    userId: user.id,
    email: user.email,
    role: user.role,
  });
  return user;
};

/**
 * Login and issue token pair
 */
const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      password: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      //   deletedAt: true,
    },
  });

  if (!user) {
    const err = new Error("Invalid email or password");
    err.statusCode = 401;
    throw err;
  }

  if (user.status !== "ACTIVE" || user.deletedAt) {
    const err = new Error("Account is inactive or has been deactivated");
    err.statusCode = 401;
    throw err;
  }

  const passwordValid = await bcrypt.compare(password, user.password);
  if (!passwordValid) {
    const err = new Error("Invalid email or password");
    err.statusCode = 401;
    throw err;
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken();

  // Persist refresh token
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + REFRESH_EXPIRES_MS),
    },
  });

  // Cache user for quick auth lookups
  await cacheSet(
    `user:${user.id}`,
    {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
    },
    300,
  );

  logger.info("User logged in", { userId: user.id, email: user.email });

  const { password: _, ...userWithoutPassword } = user;
  return { accessToken, refreshToken, user: userWithoutPassword };
};

/**
 * Refresh access token using a valid refresh token
 */
const refresh = async (refreshToken) => {
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    const err = new Error("Invalid or expired refresh token");
    err.statusCode = 401;
    throw err;
  }

  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          deletedAt: true,
        },
      },
    },
  });

  if (
    !storedToken ||
    storedToken.revokedAt ||
    storedToken.expiresAt < new Date()
  ) {
    const err = new Error("Refresh token is invalid or expired");
    err.statusCode = 401;
    throw err;
  }

  if (storedToken.user.status !== "ACTIVE" || storedToken.user.deletedAt) {
    const err = new Error("Account is inactive");
    err.statusCode = 401;
    throw err;
  }

  // Rotate: revoke old, issue new
  await prisma.refreshToken.update({
    where: { token: refreshToken },
    data: { revokedAt: new Date() },
  });

  const newAccessToken = generateAccessToken(storedToken.user);
  const newRefreshToken = generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      token: newRefreshToken,
      userId: storedToken.user.id,
      expiresAt: new Date(Date.now() + REFRESH_EXPIRES_MS),
    },
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

/**
 * Logout — blacklist access token, revoke refresh token
 */
const logout = async (accessToken, refreshToken, userId) => {
  // Blacklist access token until it expires
  try {
    const decoded = jwt.decode(accessToken);
    if (decoded?.exp) {
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await cacheSet(`token:blacklist:${accessToken}`, "1", ttl);
      }
    }
  } catch {}

  // Revoke refresh token
  if (refreshToken) {
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // Invalidate user cache
  await cacheDel(`user:${userId}`);

  logger.info("User logged out", { userId });
};

/**
 * Change password
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    const err = new Error("Current password is incorrect");
    err.statusCode = 400;
    throw err;
  }

  const hashed = await bcrypt.hash(
    newPassword,
    parseInt(process.env.BCRYPT_ROUNDS || 12),
  );
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed },
  });

  // Revoke all refresh tokens (force re-login on all devices)
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  await invalidatePattern(`user:${userId}*`);
  logger.info("Password changed", { userId });
};

module.exports = { register, login, refresh, logout, changePassword };
