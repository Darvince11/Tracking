const { Prisma } = require('@prisma/client');
const AppError = require('../utils/AppError');

class ErrorHandler {
  static handle(err, req, res, next) {
    let statusCode = err.statusCode || 500;
    let errorCode = err.errorCode || 'INTERNAL_ERROR';
    let message = err.message || 'Internal server error';
    let details = err.details || null;

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      switch (err.code) {
        case 'P2002':
          statusCode = 409;
          errorCode = 'UNIQUE_CONSTRAINT';
          message = `A record with this ${err.meta?.target?.join(', ')} already exists`;
          break;
        case 'P2025':
          statusCode = 404;
          errorCode = 'NOT_FOUND';
          message = 'Record not found';
          break;
        case 'P2003':
          statusCode = 400;
          errorCode = 'FOREIGN_KEY_CONSTRAINT';
          message = 'Related record not found';
          break;
        default:
          statusCode = 400;
          errorCode = 'DATABASE_ERROR';
          message = 'Database operation failed';
      }
    }

    if (err instanceof Prisma.PrismaClientValidationError) {
      statusCode = 400;
      errorCode = 'VALIDATION_ERROR';
      message = 'Invalid data provided';
    }

    if (err.message?.includes('22P03') || err.message?.includes('incorrect binary data format')) {
      statusCode = 503;
      errorCode = 'DATABASE_SCHEMA_MISMATCH';
      message = 'The database schema is incompatible with this application version. Apply pending migrations and restart the API.';
    }

    if (err.message === 'Origin is not allowed by CORS') {
      statusCode = 403;
      errorCode = 'CORS_ORIGIN_DENIED';
      message = 'Request origin is not allowed';
    }

    if (err.name === 'JsonWebTokenError') {
      statusCode = 401;
      errorCode = 'INVALID_TOKEN';
      message = 'Invalid token';
    }

    if (err.name === 'TokenExpiredError') {
      statusCode = 401;
      errorCode = 'TOKEN_EXPIRED';
      message = 'Token has expired';
    }

    const localDevelopment = process.env.NODE_ENV === 'development' && !/^https:\/\//i.test(process.env.FRONTEND_URL || '');
    if (localDevelopment) {
      return res.status(statusCode).json({
        success: false,
        status: 'error',
        errorCode,
        message,
        details,
        errors: details || [],
        stack: err.stack,
        timestamp: new Date().toISOString()
      });
    }

    if (statusCode === 500) {
      message = 'An unexpected error occurred';
      errorCode = 'INTERNAL_ERROR';
      console.error('ERROR:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        userId: req.user?.id
      });
    }

    res.status(statusCode).json({
      success: false,
      status: 'error',
      errorCode,
      message,
      errors: details || [],
      timestamp: new Date().toISOString()
    });
  }

  static notFound(req, res, next) {
    next(AppError.notFound(`Route ${req.originalUrl} not found`, 'ROUTE_NOT_FOUND'));
  }
}

module.exports = ErrorHandler;
