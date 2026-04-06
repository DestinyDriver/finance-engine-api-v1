// src/app.js
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const swaggerUi = require("swagger-ui-express");

const logger = require("./utils/logger");
const swaggerSpec = require("./utils/swagger");
const routes = require("./routes");
const { requestId, requestLogger } = require("./middleware/requestLogger");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const { apiLimiter } = require("./middleware/rateLimiter");
require("dotenv").config();

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }),
);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
    exposedHeaders: [
      "X-Request-ID",
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
    ],
    credentials: true,
  }),
);

app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(requestId);
app.use(requestLogger);

const API_VERSION = process.env.API_VERSION || "v1";
app.use(`/api/${API_VERSION}`, apiLimiter);

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "finance-dashboard-api",
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get("/health/ready", async (req, res) => {
  const { prisma } = require("./utils/database");
  const { getRedis } = require("./utils/redis");
  const redis = getRedis();
  const checks = {};

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  try {
    await redis.ping();
    checks.redis = "ok";
  } catch {
    checks.redis = "error";
  }

  const allOk = Object.values(checks).every((v) => v === "ok");
  res.status(allOk ? 200 : 503).json({
    status: allOk ? "ready" : "not ready",
    checks,
    timestamp: new Date().toISOString(),
  });
});

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Finance Dashboard API Docs",
    swaggerOptions: { persistAuthorization: true },
  }),
);

app.get("/api-docs.json", (req, res) => res.json(swaggerSpec));

app.use(`/api/${API_VERSION}`, routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
