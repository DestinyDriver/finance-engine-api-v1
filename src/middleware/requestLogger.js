const { v4: uuidv4 } = require("uuid");
const morgan = require("morgan");
const logger = require("../utils/logger");

/**
 * Middleware to attach request ID to all requests
 */
const requestId = (req, res, next) => {
  req.id = uuidv4();
  res.setHeader("X-Request-ID", req.id);
  next();
};

/**
 * Morgan HTTP request logger integration with Winston
 */
const requestLogger = morgan(
  (tokens, req, res) => {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      requestId: req.id,
      method: tokens.method(req, res),
      url: tokens.url(req, res),
      status: tokens.status(req, res),
      responseTime: tokens["response-time"](req, res) + "ms",
      contentLength: tokens.res(req, res, "content-length") || "-",
      userAgent: tokens["user-agent"](req, res),
      ip: tokens["remote-addr"](req, res),
    });
  },
  {
    stream: {
      write: (message) => {
        try {
          const log = JSON.parse(message);
          if (log.status >= 400) {
            logger.warn("HTTP Request", log);
          } else {
            logger.debug("HTTP Request", log);
          }
        } catch {
          logger.info(message);
        }
      },
    },
  },
);

module.exports = {
  requestId,
  requestLogger,
};
