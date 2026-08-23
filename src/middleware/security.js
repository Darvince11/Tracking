const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const { ipKeyGenerator } = require('express-rate-limit');

class SecurityMiddleware {
  static rateLimiter() {
    return rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
      max: process.env.NODE_ENV === 'development' ? 1000 : 100,
      message: {
        status: 'error',
        message: 'Too many requests, please try again later.',
        errorCode: 'RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req, res) => {
        return req.user?.id || ipKeyGenerator(req, res);
      },
      skip: (req) => process.env.NODE_ENV === 'development'
    });
  }

  static authRateLimiter() {
    return rateLimit({
      windowMs: 15 * 60 * 1000,
      max: process.env.NODE_ENV === 'development' ? 100 : 5,
      skipSuccessfulRequests: true,
      message: {
        status: 'error',
        message: 'Too many login attempts, please try again later.',
        errorCode: 'AUTH_RATE_LIMIT'
      },
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => process.env.NODE_ENV === 'development'
    });
  }

  static sanitize() {
    return (req, res, next) => {
      if (req.body) {
        Object.keys(req.body).forEach(key => {
          if (typeof req.body[key] === 'string') {
            req.body[key] = req.body[key].replace(/[$.]/g, '');
          }
        });
      }
      next();
    };
  }

  static parameterPollution() {
    return hpp({
      whitelist: ['status', 'department', 'priority']
    });
  }
}

module.exports = { SecurityMiddleware };