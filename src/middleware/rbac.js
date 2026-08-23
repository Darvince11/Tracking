const prisma = require('../config/prisma');
const AppError = require('../utils/AppError');

class RBACMiddleware {
  static PERMISSIONS = {
    ADMIN: {
      // User Management
      'users:create': true,
      'users:read': true,
      'users:update': true,
      'users:delete': true,
      'users:deactivate': true,
      'users:reset_password': true,
      
      // Project Management
      'projects:create': true,
      'projects:read': true,
      'projects:update': true,
      'projects:delete': true,
      
      // Ticket Management (Global + Own)
      'tickets:create': true,
      'tickets:create_own': true,
      'tickets:read': true,
      'tickets:read_assigned': true,
      'tickets:update': true,
      'tickets:update_own': true,
      'tickets:update_assigned': true,
      'tickets:delete': true,
      'tickets:delete_own': true,
      'tickets:assign': true,
      'tickets:log_progress': true,
      
      // Logs & Analytics
      'logs:read': true,
      'logs:read_own': true,
      'dashboard:view_global': true,
      'dashboard:view_own': true,
      'analytics:view': true,
      'audit:read': true,
      
      // Profile
      'users:read_own': true,
      'users:update_own_password': true
    },
    EMPLOYEE: {
      'users:read_own': true,
      'users:update_own_password': true,
      'tickets:create_own': true,
      'tickets:read_assigned': true,
      'tickets:update_assigned': true,
      'tickets:delete_own': true,
      'tickets:log_progress': true,
      'logs:read_own': true,
      'dashboard:view_own': true
    }
  };

  static checkPermission(permission) {
    return (req, res, next) => {
      if (!req.user) {
        return next(AppError.unauthorized());
      }

      const userPermissions = this.PERMISSIONS[req.user.role];
      
      if (!userPermissions || !userPermissions[permission]) {
        return next(AppError.forbidden(
          `Missing required permission: ${permission}`,
          'PERMISSION_DENIED'
        ));
      }

      next();
    };
  }

  static async checkTicketAccess(req, res, next) {
    try {
      if (req.user.role === 'ADMIN') {
        return next();
      }

      const ticketId = req.params.ticketId || req.body.ticketId;
      
      if (!ticketId) {
        return next(AppError.badRequest('Ticket ID is required'));
      }

      const ticket = await prisma.ticket.findUnique({
        where: { 
          id: ticketId,
          deletedAt: null
        }
      });

      if (!ticket) {
        return next(AppError.notFound('Ticket not found'));
      }

      if (ticket.assignedToId !== req.user.id && ticket.createdById !== req.user.id) {
        return next(AppError.forbidden(
          'You can only access tickets assigned to you or created by you',
          'TICKET_ACCESS_DENIED'
        ));
      }

      req.ticket = ticket;
      next();
    } catch (error) {
      next(error);
    }
  }

  static async checkProjectAccess(req, res, next) {
    try {
      if (req.user.role === 'ADMIN') {
        return next();
      }

      const projectId = req.params.projectId || req.body.projectId;
      
      if (!projectId) {
        return next(AppError.badRequest('Project ID is required'));
      }

      const project = await prisma.project.findUnique({
        where: { 
          id: projectId,
          deletedAt: null
        }
      });

      if (!project) {
        return next(AppError.notFound('Project not found'));
      }

      if (project.department !== req.user.department) {
        return next(AppError.forbidden(
          'You can only access projects in your department',
          'PROJECT_ACCESS_DENIED'
        ));
      }

      req.project = project;
      next();
    } catch (error) {
      next(error);
    }
  }

  static async checkUserManagementAccess(req, res, next) {
    try {
      const targetUserId = req.params.userId || req.body.userId;
      
      if (!targetUserId) {
        return next();
      }

      if (req.user.role === 'ADMIN') {
        if (req.user.id === targetUserId && req.method === 'DELETE') {
          return next(AppError.badRequest('Cannot delete your own account'));
        }
        return next();
      }

      if (req.user.id !== targetUserId) {
        return next(AppError.forbidden(
          'You can only access your own profile',
          'USER_ACCESS_DENIED'
        ));
      }

      next();
    } catch (error) {
      next(error);
    }
  }
}

module.exports = RBACMiddleware;
