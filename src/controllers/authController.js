const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const AppError = require('../utils/AppError');
const { asyncHandler } = require('../utils/asyncHandler');

const ACCESS_TOKEN_DURATION = '25m';
const REFRESH_SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

class AuthController {
  static login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw AppError.badRequest('Email and password are required', 'MISSING_FIELDS');
    }

    const user = await prisma.user.findUnique({
      where: { email, deletedAt: null }
    });

    if (!user) {
      throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    if (user.accountStatus !== 'ACTIVE') {
      throw AppError.forbidden('Account is not active', 'ACCOUNT_INACTIVE');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil - new Date()) / 60000);
      throw AppError.forbidden(
        `Account locked. Try again in ${minutesLeft} minutes`,
        'ACCOUNT_LOCKED'
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      const attempts = user.loginAttempts + 1;
      const updateData = { loginAttempts: attempts };
      
      if (attempts >= 5) {
        updateData.lockedUntil = new Date(Date.now() + 30 * 60000); // 30-minute lock
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData
      });

      throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    // Reset login attempts on successful login
    await prisma.user.update({
      where: { id: user.id },
      data: { loginAttempts: 0, lockedUntil: null }
    });

    // Create 5-hour JWT Session Tokens
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        employeeId: user.employeeId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        department: user.department
      },
      process.env.JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_DURATION }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        refreshToken,
        ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
        userAgent: req.headers['user-agent'] || null,
        expiresAt: new Date(Date.now() + REFRESH_SESSION_DURATION_MS)
      }
    });

    // FIX: Added `await` to prevent race conditions and passed a pure JS Object to match Prisma's `Json` type
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        entity: 'USER',
        entityId: user.id,
        ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
        userAgent: req.headers['user-agent'] || null,
        newValue: { email: user.email, role: user.role }
      }
    }).catch(err => console.error('Login AuditLog Error:', err));

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: REFRESH_SESSION_DURATION_MS,
      path: '/api/auth'
    });

    res.json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          employeeId: user.employeeId,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          department: user.department
        },
        token
      }
    });
  });

  static logout = asyncHandler(async (req, res) => {
    const token = req.token;

    if (req.user && req.user.id) {
      // FIX: Added `await` to guarantee log creation before session clearing
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'LOGOUT',
          entity: 'USER',
          entityId: req.user.id,
          ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
          userAgent: req.headers['user-agent'] || null
        }
      }).catch(err => console.error('Logout AuditLog Error:', err));
    }

    await prisma.session.deleteMany({
      where: { token }
    });
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/api/auth'
    });

    res.json({
      status: 'success',
      message: 'Logged out successfully'
    });
  });

  static refreshToken = asyncHandler(async (req, res) => {
    const refreshToken = req.body?.refreshToken || req.headers.cookie
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('refreshToken='))
      ?.slice('refreshToken='.length);

    if (!refreshToken) {
      throw AppError.badRequest('Refresh token is required', 'TOKEN_MISSING');
    }

    // O(1) FAST LOOKUP: Uses unique index on refreshToken
    const session = await prisma.session.findUnique({
      where: { refreshToken }
    });

    if (!session || session.expiresAt <= new Date()) {
      throw AppError.unauthorized('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch (error) {
      throw AppError.unauthorized('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
    }

    const user = await prisma.user.findFirst({
      where: { id: decoded.userId, accountStatus: 'ACTIVE', deletedAt: null }
    });

    if (!user) {
      throw AppError.unauthorized('User account is unavailable', 'USER_NOT_FOUND');
    }

    const newToken = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        employeeId: user.employeeId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        department: user.department
      },
      process.env.JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_DURATION }
    );

    await prisma.session.update({
      where: { id: session.id },
      data: {
        token: newToken,
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + REFRESH_SESSION_DURATION_MS)
      }
    });

    res.json({
      status: 'success',
      data: { token: newToken }
    });
  });
}

module.exports = AuthController;
