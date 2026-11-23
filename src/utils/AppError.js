/**
 * Safe, expected application error.
 * Controllers/middleware may translate this to an HTTP response.
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = statusCode < 500;
    Error.captureStackTrace?.(this, AppError);
  }
}

module.exports = AppError;
