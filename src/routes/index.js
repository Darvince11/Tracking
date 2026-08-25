const express = require('express');
const router = express.Router();
const Joi = require('joi');

// Middleware
const AuthMiddleware = require('../middleware/auth');
const RBACMiddleware = require('../middleware/rbac');
const { ValidationMiddleware } = require('../middleware/validation');

// Controllers
const AuthController = require('../controllers/authController');
const { UserController } = require('../controllers/userController');
const { TicketController } = require('../controllers/ticketController');
const { GroupTaskController } = require('../controllers/GroupTaskController');
const { AdminToolsController } = require('../controllers/AdminToolsController');
const { ActivityLogController } = require('../controllers/ActivityLogController');
const { StatsController } = require('../controllers/StatsController');

// Services & Validators
const TrackingService = require('../services/trackingService');
const { UserValidator } = require('../validators/userValidator');
const { TicketValidator } = require('../validators/ticketValidator');

const { asyncHandler } = require('../utils/asyncHandler');
const prisma = require('../config/prisma');

const groupTaskCreateSchema = Joi.object({
  title: Joi.string().trim().min(3).max(200).required(),
  description: Joi.string().trim().min(1).max(5000).required(),
  memberIds: Joi.array().items(Joi.string().uuid()).min(1).unique().required()
});
const groupTaskUpdateSchema = Joi.object({
  title: Joi.string().trim().min(3).max(200),
  description: Joi.string().trim().min(1).max(5000),
  status: Joi.string().valid('OPEN', 'IN_PROGRESS', 'BLOCKED', 'UNDER_REVIEW', 'COMPLETED', 'CANCELLED'),
  memberIds: Joi.array().items(Joi.string().uuid()).min(1).unique()
}).min(1);
const userStatusSchema = Joi.object({ action: Joi.string().valid('activate', 'deactivate').required() });
const auditLogQuerySchema = Joi.object({
  userId: Joi.string().uuid(),
  action: Joi.string().trim().max(100),
  entity: Joi.string().trim().max(100),
  dateFrom: Joi.date().iso(),
  dateTo: Joi.date().iso().min(Joi.ref('dateFrom')),
  search: Joi.string().trim().max(200),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10)
});

// ================================================
// AUTH ROUTES (Public)
// ================================================

router.post('/auth/login',
  ValidationMiddleware.validate(
    Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required()
    })
  ),
  AuthController.login
);

router.post('/auth/logout',
  AuthMiddleware.authenticate,
  AuthController.logout
);

router.post('/auth/refresh',
  AuthController.refreshToken
);

// ================================================
// PROTECTED ROUTES (All authenticated users)
// ================================================

router.use(AuthMiddleware.authenticate);

// Profile routes
router.get('/profile', UserController.getProfile);

router.patch('/profile/password',
  ValidationMiddleware.validate(UserValidator.updatePassword()),
  UserController.updatePassword
);

// ================================================
// TICKET ROUTES (Employee + Admin)
// ================================================

// 1. STATIC TICKET ROUTES (Must be before dynamic /:ticketId routes)
router.get('/tickets/team-tickets', 
  TicketController.getTeamTickets
);

// Added this so the frontend admin view connects seamlessly
router.get('/tickets/directory',
  AuthMiddleware.authorize('ADMIN'),
  ValidationMiddleware.validateQuery(TicketValidator.queryTickets()),
  TicketController.getTicketDirectory
);

// High-performance personal tickets fetch
router.get('/tickets',
  ValidationMiddleware.validateQuery(TicketValidator.queryTickets()),
  TicketController.getMyTickets
);

router.post('/tickets',
  ValidationMiddleware.validate(TicketValidator.createTicket()),
  TicketController.createTicket
);

// 2. DYNAMIC TICKET ROUTES (Must be at the bottom of the block)
router.get('/tickets/:ticketId',
  TicketController.getTicketDetails
);

router.patch('/tickets/:ticketId',
  ValidationMiddleware.validate(TicketValidator.updateTicket()),
  TicketController.updateTicket
);

router.delete('/tickets/:ticketId',
  TicketController.deleteTicket
);

router.post('/tickets/:ticketId/logs',
  ValidationMiddleware.validate(TicketValidator.logProgress()),
  TicketController.logTicketProgress
);


// ================================================
// GROUP TASKS (Employee Read-Only)
// ================================================

router.get('/group-tasks', GroupTaskController.getGroupTasks);

// ================================================
// EMPLOYEE DASHBOARD
// ================================================

router.get('/dashboard',
  asyncHandler(async (req, res) => {
    const where = {
      deletedAt: null
    };

    if (req.user.role === 'EMPLOYEE') {
      where.OR = [
        { assignedToId: req.user.id },
        { createdById: req.user.id }
      ];
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        project: { select: { id: true, trackingNumber: true, title: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } }
      },
      orderBy: { updatedAt: 'desc' },
      take: 20
    });

    res.json({ status: 'success', data: { tickets } });
  })
);


// ================================================
// ADMIN ROUTES
// ================================================

router.use('/admin', AuthMiddleware.authorize('ADMIN'));

// SLA Monitoring Routes
router.get('/admin/sla/metrics', TicketController.getAdminSLAMetrics);
router.get('/admin/sla/breaches', TicketController.getAdminSLABreaches);

// Admin Dashboard
router.get('/admin/dashboard',
  asyncHandler(async (req, res) => {
    const metrics = await TrackingService.getDashboardMetrics();
    res.json({ status: 'success', data: metrics });
  })
);

// ================================================
// ADMIN - USER MANAGEMENT
// ================================================

router.post('/admin/users',
  ValidationMiddleware.validate(UserValidator.createUser()),
  UserController.createUser
);

router.get('/admin/users',
  UserController.getAllUsers
);

router.patch('/admin/users/:userId/status',
  ValidationMiddleware.validate(userStatusSchema),
  UserController.toggleUserStatus
);

router.delete('/admin/users/:userId',
  UserController.deleteUser
);

// ================================================
// ADMIN - TICKET MANAGEMENT
// ================================================

// 1. STATIC ADMIN TICKET ROUTES
router.get('/admin/tickets/directory',
  ValidationMiddleware.validateQuery(TicketValidator.queryTickets()),
  TicketController.getTicketDirectory
);

router.get('/admin/tickets/blocked',
  TicketController.getBlockedTickets
);

router.post('/admin/tickets',
  ValidationMiddleware.validate(TicketValidator.createTicket()),
  TicketController.createTicket
);

// 2. DYNAMIC ADMIN TICKET ROUTES
router.patch('/admin/tickets/:ticketId',
  ValidationMiddleware.validate(TicketValidator.updateTicket()),
  TicketController.updateTicket
);

router.delete('/admin/tickets/:ticketId',
  TicketController.deleteTicket
);


// ================================================
// ADMIN - GROUP TASKS (CRUD)
// ================================================

router.post('/admin/group-tasks', ValidationMiddleware.validate(groupTaskCreateSchema), GroupTaskController.createGroupTask);
router.patch('/admin/group-tasks/:id', ValidationMiddleware.validate(groupTaskUpdateSchema), GroupTaskController.updateGroupTask);
router.delete('/admin/group-tasks/:id', GroupTaskController.deleteGroupTask);

// ================================================
// ADMIN - REPORTING & AUDIT LOGS
// ================================================

router.get('/admin/activity-logs', ActivityLogController.getAdminLogs);
router.get('/admin/stats/team', StatsController.getTeamStats);
router.get('/admin/reports', AdminToolsController.generateReport);
router.get('/admin/audit-logs',
  ValidationMiddleware.validateQuery(auditLogQuerySchema),
  AdminToolsController.getAuditLogs
);

// ================================================
// ADMIN - EMPLOYEE TRACKING
// ================================================

router.get('/admin/employees/:userId/activity',
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const [logs, totalCount] = await Promise.all([
      prisma.ticketLog.findMany({
        where: { userId },
        include: {
          ticket: {
            select: {
              trackingNumber: true,
              title: true,
              status: true,
              priority: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: parseInt(limit)
      }),
      prisma.ticketLog.count({ where: { userId } })
    ]);

    res.json({
      status: 'success',
      data: {
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      }
    });
  })
);

router.get('/admin/employees/:userId/productivity',
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { period = '7d' } = req.query;

    const periodMap = { '1d': 1, '7d': 7, '30d': 30, '90d': 90 };
    const days = periodMap[period] || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const logs = await prisma.ticketLog.findMany({
      where: {
        userId,
        createdAt: { gte: since }
      },
      include: {
        ticket: {
          select: {
            trackingNumber: true,
            title: true,
            department: true
          }
        }
      }
    });

    const totalHours = logs.reduce((sum, log) => sum + log.workHours, 0);
    const uniqueTickets = new Set(logs.map(l => l.ticketId)).size;

    res.json({
      status: 'success',
      data: {
        period,
        days,
        totalWorkHours: parseFloat(totalHours.toFixed(2)),
        averageDailyHours: parseFloat((totalHours / days).toFixed(2)),
        totalLogEntries: logs.length,
        uniqueTicketsWorked: uniqueTickets
      }
    });
  })
);

module.exports = router;
