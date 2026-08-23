class AppError extends Error {
  constructor(message, statusCode, errorCode = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request', errorCode = 'BAD_REQUEST', details = null) {
    return new AppError(message, 400, errorCode, details);
  }

  static unauthorized(message = 'Unauthorized', errorCode = 'UNAUTHORIZED') {
    return new AppError(message, 401, errorCode);
  }

  static forbidden(message = 'Forbidden', errorCode = 'FORBIDDEN') {
    return new AppError(message, 403, errorCode);
  }

  static notFound(message = 'Resource not found', errorCode = 'NOT_FOUND') {
    return new AppError(message, 404, errorCode);
  }

  static conflict(message = 'Conflict', errorCode = 'CONFLICT') {
    return new AppError(message, 409, errorCode);
  }

  static tooMany(message = 'Too many requests', errorCode = 'RATE_LIMIT') {
    return new AppError(message, 429, errorCode);
  }

  static internal(message = 'Internal server error', errorCode = 'INTERNAL_ERROR') {
    return new AppError(message, 500, errorCode);
  }
}

module.exports = AppError;
