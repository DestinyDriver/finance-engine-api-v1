const cron = require("node-cron");
const { prisma } = require("../utils/database");
const { redis } = require("../utils/redis");
const logger = require("../utils/logger");

/**
 * Token cleanup job - runs daily at 2 AM
 * Removes expired and revoked refresh tokens older than 1 day
 */
const tokenCleanupJob = cron.schedule("0 2 * * *", async () => {
  try {
    logger.info("[CRON] Starting token cleanup job");

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const deleted = await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } }, // Expired tokens
          {
            AND: [
              { revokedAt: { not: null } },
              { revokedAt: { lt: oneDayAgo } },
            ],
          }, // Revoked >1d ago
        ],
      },
    });

    logger.info(
      `[CRON] Token cleanup completed: ${deleted.count} tokens deleted`,
    );
  } catch (error) {
    logger.error("[CRON] Token cleanup job failed:", error);
  }
});

/**
 * Audit log cleanup job - runs weekly on Sunday at 3 AM
 * Removes audit logs older than 90 days
 */
const auditLogCleanupJob = cron.schedule("0 3 * * 0", async () => {
  try {
    logger.info("[CRON] Starting audit log cleanup job");

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const deleted = await prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: ninetyDaysAgo },
      },
    });

    logger.info(
      `[CRON] Audit log cleanup completed: ${deleted.count} logs deleted`,
    );
  } catch (error) {
    logger.error("[CRON] Audit log cleanup job failed:", error);
  }
});

/**
 * Start all cron jobs
 */
const startJobs = () => {
  logger.info("Starting background jobs...");
  // Jobs are automatically started via cron.schedule()
};

/**
 * Stop all cron jobs gracefully
 */
const stopJobs = () => {
  logger.info("Stopping background jobs...");
  // Stop all cron tasks
  cron.getTasks().forEach((task) => task.stop());
};

module.exports = {
  tokenCleanupJob,
  auditLogCleanupJob,
  startJobs,
  stopJobs,
};
