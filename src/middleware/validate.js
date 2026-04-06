const { validationResult } = require("express-validator");
const response = require("../utils/response");

/**
 * Express-validator error formatter
 * Collects validation errors and returns formatted response
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
      value: err.value,
    }));
    return response.validationError(res, formattedErrors);
  }

  next();
};

module.exports = validate;
