const express = require('express');
const { ActivityLogController } = require('../controllers/ActivityLogController');
const AuthMiddleware = require('../middleware/auth');

const router = express.Router();

// Protect all activity log routes with our fast JWT middleware
router.use(AuthMiddleware.authenticate);

// Employee Routes
router.post('/', ActivityLogController.createLog);
router.get('/me', ActivityLogController.getMyLogs);

// Admin Routes (Strictly protected)
router.get('/admin', AuthMiddleware.authorize('ADMIN'), ActivityLogController.getAdminLogs);

module.exports = router;