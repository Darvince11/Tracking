const prisma = require('../config/prisma');
const { asyncHandler } = require('../utils/asyncHandler');

function positiveInteger(value, fallback, maximum = Number.MAX_SAFE_INTEGER) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
}

function buildAuditLogWhere({ action, userId, entity, dateFrom, dateTo, search }) {
  const where = {};
  if (action) where.action = action;
  if (userId) where.userId = userId;
  if (entity) where.entity = entity;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo);
  }
  if (search) {
    where.OR = [
      { action: { contains: search, mode: 'insensitive' } },
      { entity: { contains: search, mode: 'insensitive' } },
      { entityId: { contains: search, mode: 'insensitive' } }
    ];
  }
  return where;
}

class AdminToolsController {
  // Admin Only: View system-wide Audit Logs
  static getAuditLogs = asyncHandler(async (req, res) => {
    const page = positiveInteger(req.query.page, 1);
    const limit = positiveInteger(req.query.limit, 10, 100);
    const skip = (page - 1) * limit;
    const where = buildAuditLogWhere(req.query);

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, employeeId: true, email: true } }
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit
      }),
      prisma.auditLog.count({ where })
    ]);

    const totalPages = Math.ceil(total / limit);
    res.json({
      status: 'success',
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });
  });

  // Admin Only: Generate Performance Reports
  static generateReport = asyncHandler(async (req, res) => {
    const { interval } = req.query; // 'DAILY', 'WEEKLY', 'MONTHLY'
    
    const now = new Date();
    let startDate = new Date();

    if (interval === 'DAILY') startDate.setDate(now.getDate() - 1);
    else if (interval === 'WEEKLY') startDate.setDate(now.getDate() - 7);
    else if (interval === 'MONTHLY') startDate.setMonth(now.getMonth() - 1);
    else startDate.setDate(now.getDate() - 30); // Default to last 30 days

    // High-speed parallel aggregation including the ticket logs for the frontend tables
    const [ticketsCompleted, newTickets, activeUsers, reportTickets] = await Promise.all([
      prisma.ticket.count({
        where: { status: 'COMPLETED', completedAt: { gte: startDate } }
      }),
      prisma.ticket.count({
        where: { createdAt: { gte: startDate } }
      }),
      prisma.session.groupBy({
        by: ['userId'],
        where: { lastActivity: { gte: startDate } }
      }),
      prisma.ticket.findMany({
        where: {
          deletedAt: null,
          OR: [
            { createdAt: { gte: startDate } },
            { updatedAt: { gte: startDate } }
          ]
        },
        include: {
          assignee: { select: { firstName: true, lastName: true } }
        },
        orderBy: { updatedAt: 'desc' },
        take: 1000
      })
    ]);

    res.json({
      status: 'success',
      data: {
        report: {
          interval: interval || 'LAST_30_DAYS',
          startDate,
          endDate: now,
          metrics: {
            ticketsCompleted,
            newTicketsCreated: newTickets,
            uniqueActiveUsers: activeUsers.length
          },
          // FIXED: Included activities array so the frontend tables and employee breakdown populate instantly
          activities: reportTickets
        }
      }
    });
  });
}

module.exports = { AdminToolsController, positiveInteger, buildAuditLogWhere };
