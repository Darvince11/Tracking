const HOUR_MS = 60 * 60 * 1000;

function getSLATiming(ticket, now = Date.now()) {
  const createdAt = new Date(ticket.createdAt).getTime();
  const explicitDeadline = ticket.deadline ? new Date(ticket.deadline).getTime() : null;
  const hours = Number(ticket.slaHours || ticket.estimatedHours || 24);
  const dueAt = explicitDeadline || createdAt + Math.max(hours, 0.01) * HOUR_MS;
  const totalMs = Math.max(dueAt - createdAt, 1);
  const elapsedMs = Math.max(now - createdAt, 0);

  return {
    dueAt,
    remainingHours: (dueAt - now) / HOUR_MS,
    usagePercent: (elapsedMs / totalMs) * 100,
    breached: now >= dueAt,
  };
}

module.exports = { HOUR_MS, getSLATiming };
