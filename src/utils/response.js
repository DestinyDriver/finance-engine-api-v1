// src/utils/response.js
/**
 * Standardized API response helpers
 * All responses follow: { success: bool, data/error, message, page?, total?, pageSize? }
 */

const success = (res, data = null, message = "Success", statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
  });
};

const created = (res, data = null, message = "Created") => {
  return success(res, data, message, 201);
};

const paginated = (res, data = [], message = "Success", pagination = {}) => {
  return res.status(200).json({
    success: true,
    data,
    message,
    ...pagination,
  });
};

const noContent = (res) => {
  return res.status(204).send();
};

const error = (
  res,
  message = "Internal server error",
  statusCode = 500,
  errors = null,
) => {
  const response = {
    success: false,
    message,
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

const validationError = (res, errors = []) => {
  return error(res, "Validation failed", 422, errors);
};

const notFound = (res, resource = "Resource") => {
  return error(res, `${resource} not found`, 404);
};

const unauthorized = (res, message = "Unauthorized") => {
  return error(res, message, 401);
};

const forbidden = (res, message = "Forbidden") => {
  return error(res, message, 403);
};

const conflict = (res, message = "Conflict") => {
  return error(res, message, 409);
};

/**
 * Build pagination metadata
 */
const buildPagination = (page = 1, pageSize = 20, total = 0) => {
  const totalPages = Math.ceil(total / pageSize);
  return {
    page: parseInt(page),
    pageSize: parseInt(pageSize),
    total,
    totalPages,
    hasMore: page < totalPages,
  };
};

module.exports = {
  success,
  created,
  paginated,
  noContent,
  error,
  validationError,
  notFound,
  unauthorized,
  forbidden,
  conflict,
  buildPagination,
};
