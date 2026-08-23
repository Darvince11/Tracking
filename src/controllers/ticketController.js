const prisma = require('../config/prisma');
const AppError = require('../utils/AppError');
const { asyncHandler } = require('../utils/asyncHandler');
const { IdGenerator } = require('../utils/idGenerator');
const SLAService = require('../services/slaService');

// Helper to calculate remaining SLA for the frontend live countdown
const calculateSLARemaining = (deadline, status) => {
  if (!deadline || status === 'COMPLETED' || status === 'CANCELLED') return null;
  return new Date(deadline).getTime() - Date.now();
};

class TicketController {
  /**
   * Create a new ticket
   * POST /api/tickets
   */
  static createTicket = asyncHandler(async (req, res) => {
    const { title, description, department, estimatedHours, priority, deadline, projectId, assignedToId } = req.body;

    const trackingNumber = await IdGenerator.generateTrackingNumber('TICKET');
    const parsedEstimatedHours = parseFloat(estimatedHours) || 0;

    const ticket = await prisma.ticket.create({
      data: {
        trackingNumber,
        title,
        description,
        department: req.user.role === 'ADMIN' ? (department || req.user.department) : req.user.department,
        estimatedHours: parsedEstimatedHours,
        slaHours: parsedEstimatedHours, // FIX: Explicitly set slaHours so the cron job tracks proper time
        priority: priority || 'MEDIUM',
        deadline: deadline ? new Date(deadline) : null,
        projectId: projectId || null,
        createdById: req.user.id,
        assignedToId: req.user.role === 'ADMIN' ? (assignedToId || null) : req.user.id,
        status: 'OPEN'
      },
      include: {
        creator: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
        assignee: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
        project: { select: { id: true, trackingNumber: true, title: true } }
      }
    });

    // Non-blocking Audit log
    prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE',
        entity: 'TICKET',
        entityId: ticket.id,
        newValue: { title, department, estimatedHours: parsedEstimatedHours, priority },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    }).catch(err => console.error("Ticket Create Audit Error:", err));

    res.status(201).json({
      status: 'success',
      message: 'Ticket created successfully',
      data: { ticket }
    });
  });

  /**
   * Get tickets exclusively for the current user
   * GET /api/tickets/my-tickets
   */
  static getMyTickets = asyncHandler(async (req, res) => {
    const { status, priority, search, page = 1, limit = 20 } = req.query;

    const where = { 
      deletedAt: null,
      OR: [
        { assignedToId: req.user.id },
        { createdById: req.user.id }
      ]
    };

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (search) {
      where.AND = [
        {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { trackingNumber: { contains: search, mode: 'insensitive' } }
          ]
        }
      ];
    }

    const [tickets, totalCount] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          project: { select: { id: true, trackingNumber: true, title: true } },
          assignee: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
          creator: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { logs: true } }
        },
        skip: (page - 1) * limit,
        take: parseInt(limit),
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.ticket.count({ where })
    ]);

    const enrichedTickets = tickets.map(t => ({
      ...t,
      slaRemainingMs: calculateSLARemaining(t.deadline, t.status)
    }));

    res.json({
      status: 'success',
      data: {
        tickets: enrichedTickets,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
          hasNext: page * limit < totalCount,
          hasPrev: page > 1
        }
      }
    });
  });

  /**
   * Get all team tickets visible to all employees
   * GET /api/tickets/team-tickets
   */
  static getTeamTickets = asyncHandler(async (req, res) => {
    const { status, priority, department, search, page = 1, limit = 20 } = req.query;

    const where = { 
      deletedAt: null 
    };

    if (department) where.department = department;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (search) {
      where.AND = [
        {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { trackingNumber: { contains: search, mode: 'insensitive' } }
          ]
        }
      ];
    }

    const [tickets, totalCount] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true, department: true } },
          creator: { select: { id: true, firstName: true, lastName: true } },
          project: { select: { id: true, trackingNumber: true, title: true } }
        },
        skip: (page - 1) * limit,
        take: parseInt(limit),
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.ticket.count({ where })
    ]);

    const enrichedTickets = tickets.map(t => ({
      ...t,
      slaRemainingMs: calculateSLARemaining(t.deadline, t.status)
    }));

    res.json({
      status: 'success',
      data: {
        tickets: enrichedTickets,
        pagination: {
          page: parseInt(page), limit: parseInt(limit),
          total: totalCount, pages: Math.ceil(totalCount / limit)
        }
      }
    });
  });

  /**
   * Get ticket details with all logs
   * GET /api/tickets/:ticketId
   */
  static getTicketDetails = asyncHandler(async (req, res) => {
    const { ticketId } = req.params;

    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, deletedAt: null },
      include: {
        creator: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
        assignee: { select: { id: true, firstName: true, lastName: true, employeeId: true, department: true } },
        project: { select: { id: true, trackingNumber: true, title: true } },
        logs: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, employeeId: true } }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!ticket) {
      throw AppError.notFound('Ticket not found');
    }

    res.json({
      status: 'success',
      data: { 
        ticket: {
          ...ticket,
          slaRemainingMs: calculateSLARemaining(ticket.deadline, ticket.status)
        }
      }
    });
  });

  /**
   * Log progress on a ticket
   * POST /api/tickets/:ticketId/logs
   */
  static logTicketProgress = asyncHandler(async (req, res) => {
    const { ticketId } = req.params;
    const { description, workHours, newStatus, isBlocker, blockerReason } = req.body;

    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, deletedAt: null }
    });

    if (!ticket) throw AppError.notFound('Ticket not found');

    if (req.user.role === 'EMPLOYEE') {
      if (ticket.assignedToId !== req.user.id && ticket.createdById !== req.user.id) {
        throw AppError.forbidden('You are not assigned to this ticket', 'TICKET_NOT_ASSIGNED');
      }
    }

    if (newStatus) {
      const validTransitions = {
        'OPEN': ['IN_PROGRESS'],
        'IN_PROGRESS': ['BLOCKED', 'UNDER_REVIEW', 'COMPLETED'],
        'BLOCKED': ['IN_PROGRESS'],
        'UNDER_REVIEW': ['IN_PROGRESS', 'COMPLETED'],
        'COMPLETED': [],
        'CANCELLED': []
      };

      if (!validTransitions[ticket.status] || !validTransitions[ticket.status].includes(newStatus)) {
        throw AppError.badRequest(`Cannot transition from ${ticket.status} to ${newStatus}`);
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const log = await tx.ticketLog.create({
        data: {
          ticketId,
          userId: req.user.id,
          description,
          workHours,
          statusBefore: ticket.status,
          statusAfter: newStatus || ticket.status,
          isBlocker,
          blockerReason: isBlocker ? blockerReason : null,
        }
      });

      const updateData = { actualHours: { increment: workHours } };

      if (newStatus) {
        updateData.status = newStatus;
        
        if (newStatus === 'BLOCKED') {
          updateData.isBlocked = true;
          updateData.blockReason = blockerReason;
          updateData.blockedAt = new Date();
          updateData.blockedCount = { increment: 1 };
        } else if (newStatus === 'IN_PROGRESS' && ticket.isBlocked) {
          updateData.isBlocked = false;
          updateData.blockReason = null;
          updateData.blockedAt = null;
        } else if (newStatus === 'COMPLETED') {
          updateData.completedAt = new Date();
          updateData.isOverdue = false; 
        } else if (newStatus === 'IN_PROGRESS' && !ticket.startedAt) {
          updateData.startedAt = new Date();
        }
      }

      const updatedTicket = await tx.ticket.update({
        where: { id: ticketId },
        data: updateData,
      });

      if (ticket.projectId) {
        await tx.project.update({
          where: { id: ticket.projectId },
          data: { actualHours: { increment: workHours } }
        });
      }

      return { log, ticket: updatedTicket };
    });

    const isOvertime = result.ticket.actualHours > result.ticket.estimatedHours;
    const isApproachingDeadline = result.ticket.deadline && 
      (new Date(result.ticket.deadline).getTime() - Date.now()) < 86400000;

    res.status(201).json({
      status: 'success',
      message: 'Progress logged successfully',
      data: {
        log: result.log,
        ticket: { ...result.ticket, slaRemainingMs: calculateSLARemaining(result.ticket.deadline, result.ticket.status) },
        warnings: [
          ...(isOvertime ? ['Ticket has exceeded estimated hours'] : []),
          ...(isApproachingDeadline ? ['Ticket is approaching deadline'] : [])
        ]
      }
    });
  });

  /**
   * Update ticket details
   * PATCH /api/admin/tickets/:ticketId
   */
  static updateTicket = asyncHandler(async (req, res) => {
    const { ticketId } = req.params;
    const { title, description, status, priority, estimatedHours, deadline, assignedToId } = req.body;

    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, deletedAt: null }
    });

    if (!ticket) throw AppError.notFound('Ticket not found');

    const isCreator = ticket.createdById === req.user.id;
    const isAssignee = ticket.assignedToId === req.user.id;

    if (req.user.role !== 'ADMIN' && !isCreator && !isAssignee) {
      throw AppError.forbidden('You can only update tickets assigned to you');
    }

    const updateData = {};
    if (title !== undefined && req.user.role === 'ADMIN') updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined && req.user.role === 'ADMIN') updateData.priority = priority;
    
    if (estimatedHours !== undefined && req.user.role === 'ADMIN') {
      const parsedHours = parseFloat(estimatedHours) || 0;
      updateData.estimatedHours = parsedHours;
      updateData.slaHours = parsedHours; // Sync slaHours
    }

    if (assignedToId !== undefined && req.user.role === 'ADMIN') updateData.assignedToId = assignedToId;
    if (deadline !== undefined && req.user.role === 'ADMIN') updateData.deadline = deadline ? new Date(deadline) : null;
    if (req.user.role === 'ADMIN' &&
        (estimatedHours !== undefined || deadline !== undefined || assignedToId !== undefined)) {
      updateData.slaWarningSent = false;
      updateData.slaCriticalSent = false;
      updateData.overdueNotified = false;
      updateData.slaBreachedAt = null;
      updateData.isOverdue = false;
    }
    
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'IN_PROGRESS' && ticket.status !== 'IN_PROGRESS' && !ticket.startedAt) {
        updateData.startedAt = new Date();
      }
      if (status === 'COMPLETED') updateData.isOverdue = false;
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: updateData,
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
        project: { select: { id: true, trackingNumber: true, title: true } },
        creator: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE',
        entity: 'TICKET',
        entityId: ticketId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    }).catch(e => console.error("Update audit failed:", e));

    res.json({
      status: 'success',
      message: 'Ticket updated successfully',
      data: { ticket: { ...updatedTicket, slaRemainingMs: calculateSLARemaining(updatedTicket.deadline, updatedTicket.status) } }
    });
  });

  /**
   * Delete ticket (soft delete - Admin only)
   * DELETE /api/admin/tickets/:ticketId
   */
  static deleteTicket = asyncHandler(async (req, res) => {
    const { ticketId } = req.params;

    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, deletedAt: null }
    });

    if (!ticket) throw AppError.notFound('Ticket not found');

    if (req.user.role !== 'ADMIN' && ticket.createdById !== req.user.id) {
      throw AppError.forbidden('You can only delete your own tickets');
    }

    await prisma.ticket.update({
      where: { id: ticketId },
      data: { deletedAt: new Date(), status: 'CANCELLED' }
    });

    res.json({
      status: 'success',
      message: 'Ticket deleted successfully'
    });
  });

  /**
   * Get global ticket directory (Admin only)
   * GET /api/admin/tickets/directory
   */
  static getTicketDirectory = asyncHandler(async (req, res) => {
    const {
      status, department, priority, isBlocked, assignedTo, projectId,
      search, dateFrom, dateTo,
      page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc'
    } = req.query;

    const ALLOWED_SORT_FIELDS = [
      'createdAt', 'updatedAt', 'status', 'priority',
      'trackingNumber', 'deadline', 'estimatedHours', 'actualHours'
    ];

    if (!ALLOWED_SORT_FIELDS.includes(sortBy)) throw AppError.badRequest('Invalid sort field');

    const where = { deletedAt: null };

    if (status) where.status = status;
    if (department) where.department = department;
    if (priority) where.priority = priority;
    if (isBlocked !== undefined) where.isBlocked = isBlocked === 'true' || isBlocked === true;
    if (assignedTo) where.assignedToId = assignedTo;
    if (projectId) where.projectId = projectId;

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { trackingNumber: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [tickets, totalCount, statusStats] = await Promise.all([
      prisma.ticket.findMany({
        where,
        select: {
          id: true, trackingNumber: true, title: true, status: true, priority: true,
          department: true, estimatedHours: true, actualHours: true, deadline: true,
          isBlocked: true, createdAt: true, updatedAt: true, startedAt: true, isOverdue: true,
          assignee: { select: { id: true, firstName: true, lastName: true } },
          creator: { select: { id: true, firstName: true, lastName: true } }
        },
        skip: (page - 1) * limit,
        take: parseInt(limit),
        orderBy: { [sortBy]: sortOrder }
      }),
      prisma.ticket.count({ where }),
      prisma.ticket.groupBy({ by: ['status'], where, _count: true })
    ]);

    res.json({
      status: 'success',
      data: {
        tickets,
        stats: {
          byStatus: statusStats.reduce((acc, stat) => {
            acc[stat.status] = stat._count;
            return acc;
          }, {}),
          total: totalCount,
          blockedCount: tickets.filter(t => t.isBlocked).length,
          overdueCount: tickets.filter(t => t.isOverdue).length
        },
        pagination: {
          page: parseInt(page), limit: parseInt(limit),
          total: totalCount, pages: Math.ceil(totalCount / limit)
        }
      }
    });
  });

  /**
   * Get blocked tickets (Admin only)
   * GET /api/admin/tickets/blocked
   */
  static getBlockedTickets = asyncHandler(async (req, res) => {
    const blockedTickets = await prisma.ticket.findMany({
      where: { isBlocked: true, status: 'BLOCKED', deletedAt: null },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, department: true } },
        logs: {
          where: { isBlocker: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { user: { select: { firstName: true, lastName: true } } }
        }
      },
      orderBy: [{ priority: 'asc' }, { blockedAt: 'asc' }]
    });

    const enriched = blockedTickets.map(ticket => {
      const blockedSince = ticket.blockedAt || ticket.logs[0]?.createdAt;
      const blockedHours = blockedSince ? Math.round((Date.now() - new Date(blockedSince).getTime()) / 3600000) : 0;

      return {
        ...ticket,
        blockedDuration: blockedHours,
        blockedDurationFormatted: formatDuration(blockedHours),
        isCritical: ticket.priority === 'URGENT' || (ticket.priority === 'HIGH' && blockedHours > 24),
        needsEscalation: blockedHours > 48,
      };
    });

    res.json({ status: 'success', data: enriched });
  });

  /**
   * Get SLA metrics for admin monitoring
   * GET /api/admin/sla/metrics
   */
  static getAdminSLAMetrics = asyncHandler(async (req, res) => {
    const metrics = await SLAService.getSLAMetrics();
    const complianceRate = metrics.total > 0 ? Math.round((metrics.compliant / metrics.total) * 100) : 100;

    res.json({
      status: 'success',
      data: {
        totalMonitored: metrics.total,
        compliantCount: metrics.compliant,
        breachedCount: metrics.breached,
        complianceRate
      }
    });
  });

  /**
   * Get active SLA breaches for admin monitoring
   * GET /api/admin/sla/breaches
   */
  static getAdminSLABreaches = asyncHandler(async (req, res) => {
    const breaches = await prisma.ticket.findMany({
      where: {
        deletedAt: null,
        slaBreachedAt: { not: null },
        status: { notIn: ['COMPLETED', 'CANCELLED'] }
      },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } }
      },
      orderBy: { slaBreachedAt: 'desc' }
    });

    const formatted = breaches.map(t => ({
      ...t,
      slaDeadline: t.deadline || t.slaBreachedAt
    }));

    res.json({
      status: 'success',
      data: formatted
    });
  });
}

function formatDuration(hours) {
  if (hours < 1) return `${Math.round(hours * 60)} minutes`;
  if (hours < 24) return `${hours} hours`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

module.exports = { TicketController };
