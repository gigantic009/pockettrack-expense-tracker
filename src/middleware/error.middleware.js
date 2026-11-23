const AppError = require("../utils/AppError");

/** Centralized Express error response handler. */
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const known = err instanceof AppError;
  const statusCode = known ? err.statusCode : 500;
  const message = known ? err.message : "An unexpected error occurred.";

  if (statusCode >= 500) {
    // Server-side logging should never include request secrets.
    console.error(err);
  }

  res.status(statusCode).json({
    error: message,
    code: known ? err.code : "INTERNAL_ERROR"
  });
}

module.exports = errorHandler;
