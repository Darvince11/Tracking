const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const AppError = require('../utils/AppError');
const { asyncHandler } = require('../utils/asyncHandler');
const { IdGenerator } = require('../utils/idGenerator');

class UserController {
  static createUser = asyncHandler(async (req, res) => {
    // ✅ FIX 1: Extract 'password' directly from the frontend request
    const { firstName, lastName, email, department, role, password } = req.body;

    // ✅ FIX 2: Ensure the frontend actually sent a password before proceeding
    if (!password) {
      throw AppError.badRequest('Password is required', 'MISSING_PASSWORD');
    }

    const existingUser = await prisma.user.findFirst({
      where: { email, deletedAt: null }
    });

    if (existingUser) {
      throw AppError.conflict('User with this email already exists', 'USER_EXISTS');
    }

    const employeeId = await IdGenerator.generateEmployeeId(department);
    
    // ✅ FIX 3: Hash the exact password the admin typed! (Generator completely removed)
    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          employeeId,
          firstName,
          lastName,
          email,
          password: hashedPassword,
          department,
          role: role || 'EMPLOYEE',
          accountStatus: 'ACTIVE',
          passwordChangedAt: new Date(),
          passwordHistory: [hashedPassword]
        },
        select: {
          id: true,
          employeeId: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          department: true,
          accountStatus: true,
          createdAt: true
        }
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'CREATE',
          entity: 'USER',
          entityId: user.id,
          newValue: { firstName, lastName, email, department, role },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        }
      });

      return user;
    });

    console.log(`Admin ${req.user.employeeId} created user: ${employeeId}`);

    res.status(201).json({
      status: 'success',
      message: 'User created successfully',
      data: {
        user: result
        // (Removed the tempPassword return since the admin already knows what they typed)
      }
    });
  });

  static getAllUsers = asyncHandler(async (req, res) => {
    const { department, role, status, search, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const ALLOWED_SORT_FIELDS = ['createdAt', 'updatedAt', 'firstName', 'lastName', 'employeeId', 'department'];
    const ALLOWED_SORT_ORDERS = ['asc', 'desc'];

    if (!ALLOWED_SORT_FIELDS.includes(sortBy)) {
      throw AppError.badRequest('Invalid sort field', 'INVALID_SORT');
    }

    if (!ALLOWED_SORT_ORDERS.includes(sortOrder)) {
      throw AppError.badRequest('Invalid sort order', 'INVALID_SORT_ORDER');
    }

    const where = { deletedAt: null };
    if (department) where.department = department;
    if (role) where.role = role;
    if (status) where.accountStatus = status;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { employeeId: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, employeeId: true, firstName: true, lastName: true,
          email: true, role: true, department: true, accountStatus: true,
          createdAt: true,
          _count: { select: { assignedTickets: { where: { deletedAt: null } }, ticketLogs: true } }
        },
        skip: (page - 1) * limit,
        take: parseInt(limit),
        orderBy: { [sortBy]: sortOrder }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      status: 'success',
      data: {
        users,
        pagination: {
          page: parseInt(page), limit: parseInt(limit),
          total: totalCount, pages: Math.ceil(totalCount / limit),
          hasNext: page * limit < totalCount, hasPrev: page > 1
        }
      }
    });
  });

  static getProfile = asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, employeeId: true, firstName: true, lastName: true,
        email: true, role: true, department: true, accountStatus: true,
        createdAt: true
      }
    });

    res.json({ status: 'success', data: { user } });
  });

  static updatePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      throw AppError.badRequest('Current password is incorrect', 'INVALID_PASSWORD');
    }

    const isPreviouslyUsed = await Promise.all(
      (user.passwordHistory || []).map(async (hash) => bcrypt.compare(newPassword, hash))
    );

    if (isPreviouslyUsed.some(Boolean)) {
      throw AppError.badRequest('Cannot reuse previous passwords', 'PASSWORD_REUSED');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
        passwordHistory: [...(user.passwordHistory || []).slice(-4), hashedPassword]
      }
    });

    await prisma.session.deleteMany({
      where: { userId: req.user.id, token: { not: req.token } }
    });

    res.json({ status: 'success', message: 'Password updated successfully' });
  });

  static toggleUserStatus = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { action } = req.body;

    if (!['activate', 'deactivate'].includes(action)) {
      throw AppError.badRequest('Invalid action. Must be "activate" or "deactivate"');
    }

    const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) throw AppError.notFound('User not found');

    if (user.role === 'ADMIN' && action === 'deactivate') {
      throw AppError.forbidden('Cannot deactivate admin accounts', 'ADMIN_DEACTIVATE_DENIED');
    }

    const newStatus = action === 'activate' ? 'ACTIVE' : 'INACTIVE';

    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          accountStatus: newStatus,
          deactivatedAt: newStatus === 'INACTIVE' ? new Date() : null,
          loginAttempts: 0, lockedUntil: null
        },
        select: { id: true, employeeId: true, firstName: true, lastName: true, accountStatus: true }
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: action === 'activate' ? 'ACTIVATE' : 'DEACTIVATE',
          entity: 'USER', entityId: user.id,
          oldValue: { accountStatus: user.accountStatus },
          newValue: { accountStatus: newStatus },
          ipAddress: req.ip, userAgent: req.headers['user-agent']
        }
      });

      if (newStatus === 'INACTIVE') {
        await tx.session.deleteMany({ where: { userId } });
      }

      return updatedUser;
    });

    res.json({ status: 'success', message: `User ${action}d successfully`, data: result });
  });

  static deleteUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (userId === req.user.id) {
      throw AppError.badRequest('Cannot delete your own account', 'SELF_DELETE_DENIED');
    }

    const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) throw AppError.notFound('User not found');

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { 
          deletedAt: new Date(), 
          accountStatus: 'INACTIVE',
          email: `${user.email}_deleted_${Date.now()}`
        }
      });

      await tx.session.deleteMany({ where: { userId } });

      await tx.auditLog.create({
        data: {
          userId: req.user.id, action: 'DELETE', entity: 'USER', entityId: userId,
          oldValue: { employeeId: user.employeeId, email: user.email, role: user.role },
          ipAddress: req.ip, userAgent: req.headers['user-agent']
        }
      });
    });

    res.json({ status: 'success', message: 'User deleted successfully' });
  });
}

module.exports = { UserController };
