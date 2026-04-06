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
    await connectDatabase();
    startJobs();

    server = app.listen(PORT, () => {
      logger.info(`⚡ API Started`, {
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

    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 15000);
  }
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception", { error: err.message, stack: err.stack });
  shutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Rejection", { reason: String(reason) });
  shutdown("unhandledRejection");
});

startServer();
