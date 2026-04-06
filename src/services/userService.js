// src/services/userService.js
const bcrypt = require("bcryptjs");
const { prisma } = require("../utils/database");
const { invalidatePattern } = require("../utils/redis");
const logger = require("../utils/logger");

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * Get all users with pagination, search, and filtering
 */
const getUsers = async ({
  page = 1,
  limit = 20,
  search,
  role,
  status,
  sortBy = "createdAt",
  sortOrder = "desc",
}) => {
  const skip = (page - 1) * limit;

  const where = {
    deletedAt: null,
    ...(search && {
      OR: [
        { email: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
      ],
    }),
    ...(role && { role }),
    ...(status && { status }),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: USER_SELECT,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: parseInt(limit),
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total };
};

/**
 * Get a single user by ID
 */
const getUserById = async (id) => {
  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: {
      ...USER_SELECT,
      _count: { select: { transactions: { where: { deletedAt: null } } } },
    },
  });

  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  return user;
};

/**
 * Update a user's profile (admin can update role/status, self can update name)
 */
const updateUser = async (id, updates, actorRole) => {
  const user = await prisma.user.findFirst({ where: { id, deletedAt: null } });
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  // Only admins can change role and status
  const allowedFields = ["firstName", "lastName"];
  if (actorRole === "ADMIN") {
    allowedFields.push("role", "status", "email");
  }

  const filteredUpdates = Object.fromEntries(
    Object.entries(updates).filter(([key]) => allowedFields.includes(key)),
  );

  const updated = await prisma.user.update({
    where: { id },
    data: filteredUpdates,
    select: USER_SELECT,
  });

  // Invalidate cache on update
  await invalidatePattern(`user:${id}*`);
  logger.info("User updated", {
    userId: id,
    fields: Object.keys(filteredUpdates),
  });

  return updated;
};

/**
 * Soft-delete a user (admin only)
 */
const deleteUser = async (id, actorId) => {
  if (id === actorId) {
    const err = new Error("You cannot delete your own account");
    err.statusCode = 400;
    throw err;
  }

  const user = await prisma.user.findFirst({ where: { id, deletedAt: null } });
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date(), status: "INACTIVE" },
  });

  // Revoke all tokens
  await prisma.refreshToken.updateMany({
    where: { userId: id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  await invalidatePattern(`user:${id}*`);
  logger.info("User soft-deleted", { userId: id, deletedBy: actorId });
};

/**
 * Update a user's status
 */
const updateUserStatus = async (id, status, actorId) => {
  if (id === actorId && status === "INACTIVE") {
    const err = new Error("You cannot deactivate your own account");
    err.statusCode = 400;
    throw err;
  }

  const user = await prisma.user.findFirst({ where: { id, deletedAt: null } });
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { status },
    select: USER_SELECT,
  });

  await invalidatePattern(`user:${id}*`);
  logger.info("User status updated", {
    userId: id,
    status,
    updatedBy: actorId,
  });

  return updated;
};

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  updateUserStatus,
};

//   const password = await bcrypt.hash(data.password, 10);
//   const user = await prisma.user.create({
//     data: {
//       email: data.email,
//       password,
//       firstName: data.firstName,
//       lastName: data.lastName,
//       role: data.role,
//       status: data.status || "ACTIVE",
//     },
//     select: {
//       id: true,
//       email: true,
//       firstName: true,
//       lastName: true,
//       role: true,
//       status: true,
//       createdAt: true,
//     },
//   });
//   return user;
// };

// exports.updateStatus = async (id, { status }) => {
//   if (!["ACTIVE", "INACTIVE"].includes(status)) {
//     const err = new Error("Invalid status");
//     err.statusCode = 400;
//     throw err;
//   }
//   return prisma.user.update({ where: { id }, data: { status } });
// };

// exports.deleteUser = async (id) => prisma.user.delete({ where: { id } });
