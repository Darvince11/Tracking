require('dotenv').config();
const { validateEnvironment } = require('./config/env');
validateEnvironment();
const express = require('express');
const compression = require('compression');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const prisma = require('./config/prisma');
const { SecurityMiddleware } = require('./middleware/security');
const ErrorHandler = require('./middleware/errorHandler');
const cacheManager = require('./cache/cacheManager');

// Route Imports
const routes = require('./routes');
const activityLogRoutes = require('./routes/activityLogRoutes');
const statsRoutes = require('./routes/statsRoutes');
const slaRoutes = require('./routes/slaRoutes');

const SLACronJob = require('./jobs/slaCron');
const emailService = require('./services/emailService');

class Application {
  constructor() {
    this.app = express();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  initializeMiddleware() {
    this.app.use(helmet());

    const allowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim().replace(/\/$/, ''))
      .filter(Boolean);
    const corsOptions = {
      origin(origin, callback) {
        const normalizedOrigin = origin?.trim().replace(/\/$/, '');
        if (!normalizedOrigin || allowedOrigins.includes(normalizedOrigin)) return callback(null, true);
        return callback(new Error('Origin is not allowed by CORS'));
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
      exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
      credentials: true,
      optionsSuccessStatus: 204
    };

    this.app.use(cors(corsOptions));
    this.app.options(/(.*)/, cors(corsOptions));

    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    //this.app.use(SecurityMiddleware.sanitize());
    this.app.use(SecurityMiddleware.parameterPollution());
    this.app.use(compression());
    
    const localDevelopment = process.env.NODE_ENV === 'development' && !/^https:\/\//i.test(process.env.FRONTEND_URL || '');
    if (localDevelopment) {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan('combined'));
    }
    
    this.app.set('trust proxy', 1);
  }

  initializeRoutes() {
    this.app.get('/', (req, res) => {
      res.json({
        name: 'Nexoratel API',
        status: 'online',
        health: '/health',
        readiness: '/ready',
        timestamp: new Date().toISOString()
      });
    });
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });
    this.app.get('/ready', async (req, res, next) => {
      try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ status: 'ready', timestamp: new Date().toISOString() });
      } catch (error) {
        next(error);
      }
    });
    
    this.app.use('/api', SecurityMiddleware.rateLimiter());
    this.app.use('/api/auth/login', SecurityMiddleware.authRateLimiter());
    
    // NEW: Mount the high-performance tracking, stats, and SLA routes
    this.app.use('/api/activity-logs', activityLogRoutes);
    this.app.use('/api/stats', statsRoutes);
    this.app.use('/api/admin/sla', slaRoutes);
    
    this.app.use('/api', routes);
    
    this.app.use(ErrorHandler.notFound);
  }

  initializeErrorHandling() {
    this.app.use(ErrorHandler.handle);
  }

  async start() {
    try {
      // Connect to database
      await prisma.$connect();
      const [slaColumn] = await prisma.$queryRaw`
        SELECT data_type
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'slaHours'
      `;
      if (!slaColumn || slaColumn.data_type !== 'double precision') {
        throw new Error(
          `Database schema mismatch: tickets.slaHours must be DOUBLE PRECISION (found ${slaColumn?.data_type || 'missing'}). Run prisma migrate deploy.`
        );
      }
      console.log('✅ Database connected');
      
      // Connect to cache
      await cacheManager.connect();
      
      // Initialize email service
      await emailService.initialize();
      console.log('✅ Email service initialized');
      
      // SCALABILITY FIX: Only run cron jobs on the main instance to prevent duplicate emails
      // Set RUN_CRON=true in your .env file for the primary server.
      const localDevelopment = process.env.NODE_ENV === 'development' && !/^https:\/\//i.test(process.env.FRONTEND_URL || '');
      if (process.env.RUN_CRON === 'true' || localDevelopment) {
        SLACronJob.initialize();
        console.log('✅ SLA monitoring started');
      } else {
        console.log('⏸️ SLA monitoring disabled for this instance (Scalability mode active)');
      }
      
      const PORT = process.env.PORT || 3000;
      this.server = this.app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
        console.log(`📍 Health check: http://localhost:${PORT}/health`);
        console.log(`📍 API base: http://localhost:${PORT}/api`);
      });
      
      this.initializeGracefulShutdown();
      
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  initializeGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`${signal} received. Shutting down gracefully...`);
      
      this.server.close(async () => {
        console.log('HTTP server closed');
        await prisma.$disconnect();
        console.log('Database disconnected');
        process.exit(0);
      });
      
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    // Handle unhandled rejections
    process.on('unhandledRejection', (error) => {
      console.error('Unhandled Rejection:', error);
    });
    
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      process.exit(1);
    });
  }
}

const app = new Application();
app.start();

module.exports = app;
