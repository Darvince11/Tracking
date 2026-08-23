import { useState, useEffect } from 'react';
import { Clock, AlertTriangle, PlayCircle } from 'lucide-react';

const normalizeStatus = (status) => String(status || '').toUpperCase().replace(/\s+/g, '_');

const SLATimer = ({ deadline, slaRemainingMs, startedAt, durationHours, status, onExpire, compact = false }) => {
  const [timeLeft, setTimeLeft] = useState(() => {
    if (slaRemainingMs !== undefined && slaRemainingMs !== null) {
      return Number(slaRemainingMs);
    }
    if (deadline) {
      return new Date(deadline).getTime() - Date.now();
    }
    return 0;
  });
  const [hasExpired, setHasExpired] = useState(false);

  const active = normalizeStatus(status) === 'IN_PROGRESS' || normalizeStatus(status) === 'INPROGRESS';

  useEffect(() => {
    const compute = () => {
      let remaining = 0;

      if (slaRemainingMs !== undefined && slaRemainingMs !== null) {
        remaining = Number(slaRemainingMs);
      } else if (deadline) {
        remaining = new Date(deadline).getTime() - Date.now();
      } else if (active) {
        const startTime = startedAt ? new Date(startedAt).getTime() : Date.now();
        const hours = Number(durationHours || 0);
        remaining = startTime + hours * 60 * 60 * 1000 - Date.now();
      }

      const reachedZero = remaining <= 0;
      setTimeLeft(reachedZero ? 0 : remaining);

      if (active && reachedZero && !hasExpired) {
        setHasExpired(true);
        onExpire?.();
      }
    };

    compute();

    if (!active && !deadline && slaRemainingMs === undefined && !durationHours) return undefined;

    const interval = window.setInterval(compute, 1000);
    return () => window.clearInterval(interval);
  }, [active, deadline, durationHours, hasExpired, onExpire, slaRemainingMs, startedAt]);

  const formatTime = (ms) => {
    if (!active && !deadline && slaRemainingMs === undefined && !durationHours) {
      return 'Waiting to start';
    }

    if (ms <= 0) return 'Overdue';

    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m left`;
    }
    return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  };

  const isExpired = timeLeft <= 0 && active;

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-md text-xs font-semibold ${compact ? 'px-2 py-1' : 'px-2.5 py-1'} ${
      isExpired
        ? 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800/50'
        : active
          ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800/50'
          : 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700'
    }`}>
      {isExpired ? <AlertTriangle size={14} /> : active ? <PlayCircle size={14} /> : <Clock size={14} />}
      <span>{formatTime(timeLeft)}</span>
    </div>
  );
};

export default SLATimer;