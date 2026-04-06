// src/server.js
require("dotenv").config();

const app = require("./app");
const { connectDatabase, disconnectDatabase } = require("./utils/database");
const { closeRedis } = require("./utils/redis");
const { startJobs, stopJobs } = require("./jobs/cleanup");
const logger = require("./utils/logger");

console.log("Starting Finance Dashboard API...");

const PORT = parseInt(process.env.PORT || 3000);

let server;

const startServer = async () => {
  try {
    // Connect to PostgreSQL
    await connectDatabase();

    // Start background cron jobs
    startJobs();

    // Start HTTP server
    server = app.listen(PORT, () => {
      logger.info(`🚀 Finance Dashboard API running`, {
        port: PORT,
        env: process.env.NODE_ENV,
        docs: `http://localhost:${PORT}/api-docs`,
        health: `http://localhost:${PORT}/health`,
      });
    });

    server.on("error", (err) => {
      logger.error("Server error", { error: err.message });
      process.exit(1);
    });
  } catch (err) {
    logger.error("Failed to start server", { error: err.message });
    process.exit(1);
  }
};

/**
 * Graceful shutdown — close connections cleanly
 */
const shutdown = async (signal) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  stopJobs();

  if (server) {
    server.close(async () => {
      logger.info("HTTP server closed");
      try {
        await disconnectDatabase();
        await closeRedis();
        logger.info("All connections closed. Bye!");
        process.exit(0);
      } catch (err) {
        logger.error("Error during shutdown", { error: err.message });
        process.exit(1);
      }
    });

    // Force exit after 15 seconds if graceful shutdown hangs
    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 15000);
  }
};

// Handle termination signals
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Handle uncaught exceptions and unhandled rejections
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception", { error: err.message, stack: err.stack });
  shutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Rejection", { reason: String(reason) });
  shutdown("unhandledRejection");
});

startServer();
