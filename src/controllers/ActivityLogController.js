const prisma = require('../config/prisma');
const AppError = require('../utils/AppError');
const { asyncHandler } = require('../utils/asyncHandler');

class ActivityLogController {
  // Employee: Create a new daily log
  static createLog = asyncHandler(async (req, res) => {
    const { content, ticketId, logDate } = req.body;

    if (!content) {
      throw AppError.badRequest('Log content is required');
    }

    if (ticketId) {
      const ticket = await prisma.ticket.findFirst({
        where: {
          id: ticketId,
          deletedAt: null,
          ...(req.user.role === 'ADMIN' ? {} : {
            OR: [{ assignedToId: req.user.id }, { createdById: req.user.id }]
          })
        },
        select: { id: true }
      });
      if (!ticket) throw AppError.forbidden('You cannot attach an activity log to this ticket', 'TICKET_ACCESS_DENIED');
    }

    const log = await prisma.activityLog.create({
      data: {
        content,
        logDate: logDate ? new Date(logDate) : new Date(),
        userId: req.user.id,
        ticketId: ticketId || null
      },
      include: {
        ticket: { select: { title: true, trackingNumber: true } }
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'Activity log saved successfully',
      data: { log }
    });
  });

  // Employee: Get their personal chronological history
  static getMyLogs = asyncHandler(async (req, res) => {
    const logs = await prisma.activityLog.findMany({
      where: { userId: req.user.id },
      include: {
        ticket: { select: { title: true, trackingNumber: true, status: true } }
      },
      orderBy: { logDate: 'desc' },
      take: 50 // Capped for fast frontend rendering
    });

    res.json({
      status: 'success',
      data: { logs }
    });
  });

  // Admin: Get centralized feed of all employee logs
  static getAdminLogs = asyncHandler(async (req, res) => {
    const { userId, ticketId, startDate, endDate, limit = 50 } = req.query;

    const where = {};
    if (userId) where.userId = userId;
    if (ticketId) where.ticketId = ticketId;
    if (startDate || endDate) {
      where.logDate = {};
      if (startDate) where.logDate.gte = new Date(startDate);
      if (endDate) where.logDate.lte = new Date(endDate);
    }

    const logs = await prisma.activityLog.findMany({
      where,
      include: {
        user: { select: { firstName: true, lastName: true, department: true } },
        ticket: { select: { title: true, trackingNumber: true } }
      },
      orderBy: { logDate: 'desc' },
      take: parseInt(limit)
    });

    res.json({
      status: 'success',
      data: { logs }
    });
  });
}

module.exports = { ActivityLogController };
