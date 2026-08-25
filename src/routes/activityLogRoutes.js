const express = require('express');
const Joi = require('joi');
const { ActivityLogController } = require('../controllers/ActivityLogController');
const AuthMiddleware = require('../middleware/auth');
const { ValidationMiddleware } = require('../middleware/validation');

const router = express.Router();
const activityLogSchema = Joi.object({
  content: Joi.string().trim().min(1).max(10000).required(),
  ticketId: Joi.string().uuid().allow(null),
  logDate: Joi.date().iso().max('now')
});

// Protect all activity log routes with our fast JWT middleware
router.use(AuthMiddleware.authenticate);

// Employee Routes
router.post('/', ValidationMiddleware.validate(activityLogSchema), ActivityLogController.createLog);
router.get('/me', ActivityLogController.getMyLogs);

// Admin Routes (Strictly protected)
router.get('/admin', AuthMiddleware.authorize('ADMIN'), ActivityLogController.getAdminLogs);

module.exports = router;
