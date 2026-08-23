const emailService = require('./emailService');
const prisma = require('../config/prisma');

class SLAService {
  static async checkAllSLAs() {
    const startTime = Date.now();
    console.log('🔍 Running SLA check...');

    try {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { email: true, firstName: true }
      });

      const activeTickets = await prisma.ticket.findMany({
        where: {
          deletedAt: null,
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
        include: {
          assignee: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });

      let warningsSent = 0;
      let criticalSent = 0;
      let breachesDetected = 0;

      for (const ticket of activeTickets) {
        const createdAt = new Date(ticket.createdAt).getTime();
        const now = Date.now();
        const elapsedHours = (now - createdAt) / (1000 * 60 * 60);
        
        const slaHours = ticket.slaHours || ticket.estimatedHours || 24;
        const warningThreshold = slaHours * 0.75;
        const criticalThreshold = slaHours * 0.90;

        // NEW FIX: Capture the exact deadline timestamp
        const explicitDeadline = ticket.slaDeadline || ticket.deadline;
        const isTimeUp = explicitDeadline ? new Date(explicitDeadline).getTime() <= now : false;

        // If hours are exceeded OR the exact clock ran out
        if ((elapsedHours >= slaHours || isTimeUp) && !ticket.slaBreachedAt) {
          console.log(`🚨 BREACH DETECTED: ${ticket.trackingNumber} - Deadline passed!`);
          
          await prisma.ticket.update({
            where: { id: ticket.id },
            data: { 
              slaBreachedAt: new Date(),
              isOverdue: true // Formally lock it as overdue in the DB
            },
          });

          await emailService.notifySLABreach(ticket, ticket.assignee, admins);
          breachesDetected++;
        } else if (elapsedHours >= criticalThreshold && !ticket.slaCriticalSent && !ticket.slaBreachedAt) {
          await prisma.ticket.update({
            where: { id: ticket.id },
            data: { slaCriticalSent: true },
          });
          criticalSent++;
        } else if (elapsedHours >= warningThreshold && !ticket.slaWarningSent && !ticket.slaBreachedAt) {
          await prisma.ticket.update({
            where: { id: ticket.id },
            data: { slaWarningSent: true },
          });
          warningsSent++;
        }
      }

      const duration = Date.now() - startTime;
      console.log(`✅ SLA check complete (${duration}ms): ${warningsSent} warnings, ${criticalSent} critical, ${breachesDetected} breaches`);

      return { checked: activeTickets.length, warningsSent, criticalSent, breachesDetected, duration };
    } catch (error) {
      console.error('SLA check failed:', error);
      throw error;
    }
  }

  static async checkDeadlines() {
    console.log('📅 Running deadline check...');

    try {
      const approachingTickets = await prisma.ticket.findMany({
        where: {
          deletedAt: null,
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
          deadline: {
            gte: new Date(),
            lte: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
          overdueNotified: false,
        },
        include: {
          assignee: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });

      let remindersSent = 0;

      for (const ticket of approachingTickets) {
        if (ticket.assignee) {
          await emailService.notifyDeadlineApproaching(ticket, ticket.assignee);
          await prisma.ticket.update({
            where: { id: ticket.id },
            data: { overdueNotified: true },
          });
          remindersSent++;
        }
      }

      console.log(`✅ Deadline check complete: ${remindersSent} reminders sent`);
      return { approaching: approachingTickets.length, remindersSent };
    } catch (error) {
      console.error('Deadline check failed:', error);
      throw error;
    }
  }

  static async getSLAMetrics() {
    const [breached, allActive] = await Promise.all([
      prisma.ticket.count({
        where: {
          deletedAt: null,
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
          // Includes both formal SLA breaches AND overdue explicit deadlines
          OR: [
            { slaBreachedAt: { not: null } },
            { isOverdue: true }
          ]
        },
      }),
      prisma.ticket.findMany({
        where: {
          deletedAt: null,
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
          slaBreachedAt: null,
          isOverdue: false // Exclude overdue tickets from the healthy "allActive" count
        },
        select: {
          id: true,
          trackingNumber: true,
          title: true,
          slaHours: true,
          estimatedHours: true,
          createdAt: true,
          deadline: true,
          slaDeadline: true,
          status: true,
          priority: true,
          assignee: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
    ]);

    const now = Date.now();
    const atRisk = allActive
      .filter(ticket => {
        // Calculate risk based on hours
        const slaHours = ticket.slaHours || ticket.estimatedHours || 24;
        const elapsedHours = (now - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60);
        const slaUsage = (elapsedHours / slaHours) * 100;
        
        return slaUsage >= 90;
      })
      .map(ticket => {
        const slaHours = ticket.slaHours || ticket.estimatedHours || 24;
        const elapsedHours = (now - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60);
        return {
          ...ticket,
          slaUsagePercent: Math.round((elapsedHours / slaHours) * 100),
        };
      });

    return {
      breached,
      atRisk,
      compliant: allActive.length - atRisk.length,
      total: breached + allActive.length,
    };
  }
}

module.exports = SLAService;
