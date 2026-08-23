const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const AppError = require('../utils/AppError');

class AuthMiddleware {
  static async authenticate(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw AppError.unauthorized('Authentication required', 'AUTH_REQUIRED');
      }

      const token = authHeader.split(' ')[1];

      if (!token) {
        throw AppError.unauthorized('Token not provided', 'TOKEN_MISSING');
      }

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET, {
          algorithms: ['HS256']
        });
      } catch (error) {
        if (error.name === 'TokenExpiredError') {
          throw AppError.unauthorized('Token has expired', 'TOKEN_EXPIRED');
        }
        throw AppError.unauthorized('Invalid token', 'INVALID_TOKEN');
      }

      // FAST O(1) LOOKUP: Uses the unique index on token
      const session = await prisma.session.findUnique({
        where: { token },
        include: {
          user: true
        }
      });

      if (!session || session.expiresAt <= new Date()) {
        throw AppError.unauthorized('Session expired or invalid', 'SESSION_EXPIRED');
      }

      const user = session.user;

      if (!user || user.deletedAt) {
        throw AppError.unauthorized('User account no longer exists', 'USER_NOT_FOUND');
      }

      if (user.lockedUntil && user.lockedUntil > new Date()) {
        throw AppError.forbidden('Account is temporarily locked', 'ACCOUNT_LOCKED');
      }

      if (user.accountStatus !== 'ACTIVE') {
        throw AppError.forbidden('Account is not active', 'ACCOUNT_INACTIVE');
      }

      // NON-BLOCKING: Update lastActivity in background so DB write latency does not delay the response
      prisma.session.update({
        where: { id: session.id },
        data: { lastActivity: new Date() }
      }).catch(err => console.error('Background lastActivity update error:', err));

      req.user = {
        id: user.id,
        employeeId: user.employeeId,
        email: user.email,
        role: user.role,
        department: user.department,
        firstName: user.firstName,
        lastName: user.lastName
      };
      
      req.sessionId = session.id;
      req.token = token;
      
      next();
    } catch (error) {
      next(error);
    }
  }

  static authorize(...roles) {
    return (req, res, next) => {
      if (!req.user) {
        return next(AppError.unauthorized('Authentication required', 'AUTH_REQUIRED'));
      }

      if (!roles.includes(req.user.role)) {
        return next(AppError.forbidden('Insufficient permissions', 'INSUFFICIENT_PERMISSIONS'));
      }

      next();
    };
  }
}

module.exports = AuthMiddleware;
