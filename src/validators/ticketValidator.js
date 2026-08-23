const Joi = require('joi');

class TicketValidator {
  static createTicket() {
    return Joi.object({
      title: Joi.string().min(5).max(200).trim().required(),
      description: Joi.string().max(5000).trim().allow('', null),
      department: Joi.string().valid(
        'WEB_DEVELOPMENT', 'CYBERSECURITY', 'CLOUD_COMPUTING',
        'POS_SYSTEMS', 'NETWORKING', 'DATA_ANALYTICS'
      ).required(),
      estimatedHours: Joi.number().min(0.5).max(1000).precision(1).required(),
      priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT').default('MEDIUM'),
      deadline: Joi.date().iso().greater('now').allow(null),
      projectId: Joi.string().uuid().allow(null),
      assignedToId: Joi.string().uuid().allow(null)
    });
  }

  static logProgress() {
    return Joi.object({
      description: Joi.string().min(10).max(2000).trim().required(),
      workHours: Joi.number().min(0.1).max(24).precision(1).required(),
      newStatus: Joi.string().valid(
        'OPEN', 'IN_PROGRESS', 'BLOCKED', 'UNDER_REVIEW', 'COMPLETED', 'CANCELLED'
      ).allow(null),
      isBlocker: Joi.boolean().default(false),
      blockerReason: Joi.string().max(1000).trim()
        .when('isBlocker', { is: true, then: Joi.required(), otherwise: Joi.allow('', null) })
    });
  }

  static queryTickets() {
    return Joi.object({
      status: Joi.string().valid('OPEN', 'IN_PROGRESS', 'BLOCKED', 'UNDER_REVIEW', 'COMPLETED', 'CANCELLED'),
      department: Joi.string().valid('WEB_DEVELOPMENT', 'CYBERSECURITY', 'CLOUD_COMPUTING', 'POS_SYSTEMS', 'NETWORKING', 'DATA_ANALYTICS'),
      priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT'),
      isBlocked: Joi.boolean(),
      search: Joi.string().max(100).trim(),
      dateFrom: Joi.date().iso(),
      dateTo: Joi.date().iso().min(Joi.ref('dateFrom')),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
      sortBy: Joi.string().valid('createdAt', 'updatedAt', 'status', 'priority', 'trackingNumber', 'deadline', 'estimatedHours').default('createdAt'),
      sortOrder: Joi.string().valid('asc', 'desc').default('desc')
    });
  }
}

module.exports = { TicketValidator };
