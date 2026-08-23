const express = require('express');
const router = express.Router();
const AuthMiddleware = require('../middleware/auth');
const SLAService = require('../services/slaService');
const { asyncHandler } = require('../utils/asyncHandler');
const prisma = require('../config/prisma');

// These middlewares are great for security, ensuring absolute protection
router.use(AuthMiddleware.authenticate);
router.use(AuthMiddleware.authorize('ADMIN'));

// FIXED: Removed '/admin/sla' prefix because index.js already handles it
router.get('/metrics', asyncHandler(async (req, res) => {
  const metrics = await SLAService.getSLAMetrics();
  res.json({ status: 'success', data: metrics });
}));

// FIXED: Synchronized with SLAService to include both breached and explicitly overdue tickets
router.get('/breaches', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  // Unified condition for both findMany and count to prevent pagination mismatch
  const breachCondition = {
    deletedAt: null,
    status: { notIn: ['COMPLETED', 'CANCELLED'] },
    OR: [
      { slaBreachedAt: { not: null } },
      { isOverdue: true }
    ]
  };

  const [breaches, total] = await Promise.all([
    prisma.ticket.findMany({
      where: breachCondition,
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
      },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: parseInt(limit),
    }),
    prisma.ticket.count({
      where: breachCondition,
    }),
  ]);

  const enriched = breaches.map(ticket => ({
    ...ticket,
    breachDuration: Math.round(
      (Date.now() - new Date(ticket.slaBreachedAt || ticket.updatedAt).getTime()) / (1000 * 60 * 60)
    ),
  }));

  res.json({
    status: 'success',
    data: enriched,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
  });
}));

// FIXED: Removed '/admin/sla' prefix
router.post('/check', asyncHandler(async (req, res) => {
  const result = await SLAService.checkAllSLAs();
  res.json({ status: 'success', message: 'SLA check completed', data: result });
}));

module.exports = router;
