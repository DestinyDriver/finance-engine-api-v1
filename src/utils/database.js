// src/utils/database.js
const { PrismaClient } = require("@prisma/client");
const logger = require("./logger");

// Prevent multiple Prisma instances in development (hot-reload safe)
let prisma;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

// Enable Prisma logging in development
if (process.env.NODE_ENV === "development") {
  prisma.$on("query", (e) => {
    logger.debug(`[Query] ${e.query} | ${e.duration}ms`);
  });
}

// Handle Prisma errors
prisma.$on("error", (e) => {
  logger.error("Prisma error:", e);
});

prisma.$on("warn", (e) => {
  logger.warn("Prisma warning:", e);
});

/**
 * Connect to database and verify connection
 */
async function connectDatabase() {
  try {
    await prisma.$executeRaw`SELECT 1`;
    logger.info("✓ Database connected successfully");
    return prisma;
  } catch (error) {
    logger.error("✗ Database connection failed:", error);
    throw error;
  }
}

/**
 * Disconnect from database gracefully
 */
async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    logger.info("✓ Database disconnected");
  } catch (error) {
    logger.error("✗ Database disconnection error:", error);
    throw error;
  }
}

module.exports = {
  prisma,
  connectDatabase,
  disconnectDatabase,
};
