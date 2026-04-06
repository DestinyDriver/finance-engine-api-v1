const logger = require("../utils/logger");
const response = require("../utils/response");

/**
 * Global error handling middleware
 * Maps common errors to appropriate HTTP status codes
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const isDevelopment = process.env.NODE_ENV === "development";

  logger.error("Error:", {
    statusCode,
    message: err.message,
    path: req.path,
    method: req.method,
    stack: isDevelopment ? err.stack : undefined,
    userId: req.user?.id,
  });

  // Prisma errors
  if (err.code?.startsWith("P")) {
    if (err.code === "P2002") {
      return response.conflict(res, `${err.meta?.target?.[0]} already exists`);
    }
    if (err.code === "P2025") {
      return response.notFound(res, "Resource");
    }
    if (err.code === "P2003") {
      return response.error(res, "Invalid reference", 400);
    }
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return response.unauthorized(res, "Invalid token");
  }
  if (err.name === "TokenExpiredError") {
    return response.unauthorized(res, "Token expired");
  }

  // Multer errors (file uploads)
  if (err.name === "MulterError") {
    return response.error(res, `File upload error: ${err.message}`, 400);
  }

  // Malformed JSON
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return response.error(res, "Invalid JSON", 400);
  }

  // Payload too large
  if (err.status === 413) {
    return response.error(res, "Payload too large", 413);
  }

  // Custom errors with statusCode
  if (err.statusCode) {
    return response.error(res, err.message, err.statusCode);
  }

  // Default 500 error
  return response.error(
    res,
    isDevelopment ? err.message : "Internal server error",
    500,
  );
};

/**
 * 404 Not Found middleware
 */
const notFoundHandler = (req, res) => {
  response.notFound(res, "Endpoint");
};

module.exports = {
  errorHandler,
  notFoundHandler,
};
