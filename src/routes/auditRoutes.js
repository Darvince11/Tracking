const express = require('express');
const router = express.Router();
const AuthMiddleware = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');
const prisma = require('../config/prisma');

router.use(AuthMiddleware.authenticate);
router.use(AuthMiddleware.authorize('ADMIN'));

router.get('/', asyncHandler(async (req, res) => {
  console.log("🔥 Audit Logs Route Hit! Frontend asked for page:", req.query.page);

  const { userId, action, entity, dateFrom, dateTo, search, page = 1, limit = 10, sortOrder = 'desc' } = req.query;

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;

  const where = {};
  if (userId) where.userId = userId;
  if (action) where.action = action;
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
    ];
  }

  console.log("🔍 Prisma Search Filters:", where);

  const [logs, totalCount] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, employeeId: true, email: true } },
      },
      orderBy: { createdAt: sortOrder },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
    prisma.auditLog.count({ where }),
  ]);

  console.log(`✅ Success! Sending ${logs.length} logs back to frontend. Total in DB: ${totalCount}`);

  res.json({
    status: 'success',
    data: logs,
    pagination: { 
      page: pageNum, 
      limit: limitNum, 
      total: totalCount, 
      pages: Math.ceil(totalCount / limitNum), 
      hasNext: pageNum * limitNum < totalCount, 
      hasPrev: pageNum > 1 
    },
  });
}));

module.exports = router;
