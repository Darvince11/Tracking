const express = require('express');
const { StatsController } = require('../controllers/StatsController');
const AuthMiddleware = require('../middleware/auth');

const router = express.Router();

// Protect all stats routes
router.use(AuthMiddleware.authenticate);

// Employee Stats
router.get('/me', StatsController.getMyStats);

// Admin Team Stats
router.get('/team', AuthMiddleware.authorize('ADMIN'), StatsController.getTeamStats);

module.exports = router;