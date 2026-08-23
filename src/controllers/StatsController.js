const prisma = require('../config/prisma');

const StatsController = {
  // Get personal productivity and task statistics for the logged-in employee
  getMyStats: async (req, res, next) => {
    try {
      const userId = req.user.id;
      const now = new Date();

      const activeTasks = await prisma.ticket.count({
        where: {
          assignedToId: userId,
          status: { not: 'COMPLETED' },
          deletedAt: null
        }
      });

      const overdueTasks = await prisma.ticket.count({
        where: {
          assignedToId: userId,
          status: { not: 'COMPLETED' },
          deadline: { lt: now },
          deletedAt: null
        }
      });

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const completedThisWeek = await prisma.ticket.count({
        where: {
          assignedToId: userId,
          status: 'COMPLETED',
          updatedAt: { gte: oneWeekAgo },
          deletedAt: null
        }
      });

      return res.status(200).json({
        success: true,
        data: {
          activeTasks,
          overdueTasks,
          completedThisWeek
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Get aggregated team-wide statistics for admins
  getTeamStats: async (req, res, next) => {
    try {
      const now = new Date();

      const [totalActive, totalOverdue, totalCompleted] = await Promise.all([
        prisma.ticket.count({
          where: { status: { not: 'COMPLETED' }, deletedAt: null }
        }),
        prisma.ticket.count({
          where: { status: { not: 'COMPLETED' }, deadline: { lt: now }, deletedAt: null }
        }),
        prisma.ticket.count({
          where: { status: 'COMPLETED', deletedAt: null }
        })
      ]);

      return res.status(200).json({
        success: true,
        data: {
          totalActive,
          totalOverdue,
          totalCompleted
        }
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = { StatsController };