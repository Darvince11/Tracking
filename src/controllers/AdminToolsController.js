const prisma = require('../config/prisma');
const { asyncHandler } = require('../utils/asyncHandler');

class AdminToolsController {
  // Admin Only: View system-wide Audit Logs
  static getAuditLogs = asyncHandler(async (req, res) => {
    const { action, userId, limit = 100 } = req.query;

    const where = {};
    if (action) where.action = action;
    if (userId) where.userId = userId;

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { firstName: true, lastName: true, email: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });

    res.json({ status: 'success', data: { logs } });
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
        orderBy: { updatedAt: 'desc' }
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

module.exports = { AdminToolsController };
