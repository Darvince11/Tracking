const emailService = require('./emailService');
const prisma = require('../config/prisma');
const { HOUR_MS, getSLATiming } = require('./slaTiming');

const ACTIVE_STATUSES = ['COMPLETED', 'CANCELLED'];

function successful(result) {
  if (Array.isArray(result)) {
    return result.some(item => item.status === 'fulfilled' && item.value?.success);
  }
  return result?.success === true;
}

class SLAService {
  static async runNotificationChecks() {
    const sla = await this.checkAllSLAs();
    const deadlines = await this.checkDeadlines();
    return { sla, deadlines };
  }

  static async checkAllSLAs() {
    const startTime = Date.now();
    const activeTickets = await prisma.ticket.findMany({
      where: { deletedAt: null, status: { notIn: ACTIVE_STATUSES } },
      include: {
        assignee: {
          select: { id: true, firstName: true, lastName: true, email: true, accountStatus: true, deletedAt: true },
        },
      },
    });

    const counts = { warningsSent: 0, criticalSent: 0, breachesDetected: 0, deliveryFailures: 0 };

    for (const ticket of activeTickets) {
      const assignee = ticket.assignee?.accountStatus === 'ACTIVE' && !ticket.assignee.deletedAt
        ? ticket.assignee
        : null;
      const timing = getSLATiming(ticket);

      try {
        if (timing.breached && (!ticket.slaBreachedAt || !ticket.overdueNotified)) {
          if (!ticket.slaBreachedAt) {
            await prisma.ticket.update({
              where: { id: ticket.id },
              data: { slaBreachedAt: new Date(), isOverdue: true },
            });
            counts.breachesDetected++;
          }
          const result = await emailService.notifySLABreach(ticket, assignee);
          if (!successful(result)) {
            counts.deliveryFailures++;
            continue;
          }
          await prisma.ticket.update({
            where: { id: ticket.id },
            data: { overdueNotified: true },
          });
        } else if (timing.usagePercent >= 90 && !ticket.slaCriticalSent && !ticket.slaBreachedAt && assignee) {
          const result = await emailService.notifySLAThreshold(ticket, assignee, 'critical', timing);
          if (!successful(result)) {
            counts.deliveryFailures++;
            continue;
          }
          await prisma.ticket.update({ where: { id: ticket.id }, data: { slaCriticalSent: true } });
          counts.criticalSent++;
        } else if (timing.usagePercent >= 75 && !ticket.slaWarningSent && !ticket.slaBreachedAt && assignee) {
          const result = await emailService.notifySLAThreshold(ticket, assignee, 'warning', timing);
          if (!successful(result)) {
            counts.deliveryFailures++;
            continue;
          }
          await prisma.ticket.update({ where: { id: ticket.id }, data: { slaWarningSent: true } });
          counts.warningsSent++;
        }
      } catch (error) {
        counts.deliveryFailures++;
        console.error(`SLA notification failed for ${ticket.trackingNumber}:`, error);
      }
    }

    const summary = { checked: activeTickets.length, ...counts, duration: Date.now() - startTime };
    console.log('SLA check complete:', summary);
    return summary;
  }

  static async checkDeadlines() {
    const now = new Date();
    const approachingTickets = await prisma.ticket.findMany({
      where: {
        deletedAt: null,
        status: { notIn: ACTIVE_STATUSES },
        deadline: { gt: now, lte: new Date(now.getTime() + 24 * HOUR_MS) },
        overdueNotified: false,
        assignedToId: { not: null },
      },
      include: {
        assignee: {
          select: { id: true, firstName: true, lastName: true, email: true, accountStatus: true, deletedAt: true },
        },
      },
    });

    let remindersSent = 0;
    let deliveryFailures = 0;
    for (const ticket of approachingTickets) {
      if (!ticket.assignee || ticket.assignee.accountStatus !== 'ACTIVE' || ticket.assignee.deletedAt) continue;
      try {
        const result = await emailService.notifyDeadlineApproaching(ticket, ticket.assignee);
        if (!successful(result)) {
          deliveryFailures++;
          continue;
        }
        await prisma.ticket.update({ where: { id: ticket.id }, data: { overdueNotified: true } });
        remindersSent++;
      } catch (error) {
        deliveryFailures++;
        console.error(`Deadline reminder failed for ${ticket.trackingNumber}:`, error);
      }
    }

    const summary = { approaching: approachingTickets.length, remindersSent, deliveryFailures };
    console.log('Deadline check complete:', summary);
    return summary;
  }

  static async getSLAMetrics() {
    const [breached, allActive] = await Promise.all([
      prisma.ticket.count({
        where: {
          deletedAt: null,
          status: { notIn: ACTIVE_STATUSES },
          OR: [{ slaBreachedAt: { not: null } }, { isOverdue: true }],
        },
      }),
      prisma.ticket.findMany({
        where: { deletedAt: null, status: { notIn: ACTIVE_STATUSES }, slaBreachedAt: null, isOverdue: false },
        select: {
          id: true, trackingNumber: true, title: true, slaHours: true, estimatedHours: true,
          createdAt: true, deadline: true, status: true, priority: true,
          assignee: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
    ]);

    const atRisk = allActive
      .map(ticket => ({ ...ticket, slaUsagePercent: Math.round(getSLATiming(ticket).usagePercent) }))
      .filter(ticket => ticket.slaUsagePercent >= 90);

    return { breached, atRisk, compliant: allActive.length - atRisk.length, total: breached + allActive.length };
  }
}

module.exports = SLAService;
