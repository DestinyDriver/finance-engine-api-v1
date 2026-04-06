const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { redis } = require("../utils/redis");

/**
 * General API rate limiter: 100 requests per 15 minutes
 */
const apiLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
    prefix: "rate-limit:api:",
  }),
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || 900000),
  max: parseInt(process.env.RATE_LIMIT_MAX || 100),
  message: "Too many requests, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Auth rate limiter: 5 failed login attempts per 15 minutes
 */
const authLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
    prefix: "rate-limit:auth:",
  }),
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || 5),
  skip: (req, res) => res.statusCode === 200 || res.statusCode === 201,
  message: "Too many login attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Dashboard rate limiter: 60 requests per minute
 */
const dashboardLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
    prefix: "rate-limit:dashboard:",
  }),
  windowMs: 60 * 1000,
  max: 60,
  message: "Dashboard requests limited, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  apiLimiter,
  authLimiter,
  dashboardLimiter,
};
