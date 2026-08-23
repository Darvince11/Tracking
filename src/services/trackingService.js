const prisma = require('../config/prisma');

class TrackingService {
  static async calculateDurationMetrics(ticketId) {
    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, deletedAt: null },
      include: { logs: { orderBy: { createdAt: 'asc' } } }
    });

    if (!ticket) return null;

    const totalWorkHours = ticket.actualHours;
    const efficiency = ticket.estimatedHours > 0 ? (totalWorkHours / ticket.estimatedHours) * 100 : 0;

    return {
      ticketId: ticket.id,
      trackingNumber: ticket.trackingNumber,
      title: ticket.title,
      estimatedHours: ticket.estimatedHours,
      actualHours: totalWorkHours,
      remainingHours: Math.max(0, ticket.estimatedHours - totalWorkHours),
      efficiency: parseFloat(efficiency.toFixed(2)),
      isOvertime: totalWorkHours > ticket.estimatedHours,
      overtimeBy: Math.max(0, totalWorkHours - ticket.estimatedHours),
      totalLogEntries: ticket.logs.length,
      isOverdue: ticket.deadline && new Date() > new Date(ticket.deadline)
    };
  }

  static async getDashboardMetrics() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [ticketStats, blockedTickets, todayLogs] = await Promise.all([
      prisma.ticket.groupBy({ by: ['status'], where: { deletedAt: null }, _count: true }),
      prisma.ticket.count({ where: { isBlocked: true, status: 'BLOCKED', deletedAt: null } }),
      prisma.ticketLog.count({ where: { createdAt: { gte: today } } })
    ]);

    return {
      overview: {
        totalTickets: ticketStats.reduce((sum, stat) => sum + stat._count, 0),
        openTickets: ticketStats.filter(s => s.status === 'OPEN').reduce((sum, s) => sum + s._count, 0),
        inProgressTickets: ticketStats.filter(s => s.status === 'IN_PROGRESS').reduce((sum, s) => sum + s._count, 0),
        blockedTickets,
        completedTickets: ticketStats.filter(s => s.status === 'COMPLETED').reduce((sum, s) => sum + s._count, 0)
      },
      todayActivity: { totalLogs: todayLogs },
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = TrackingService;
