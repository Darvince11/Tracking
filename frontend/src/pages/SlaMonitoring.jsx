import { useState, useEffect } from 'react';
import useAxios from '../hooks/useAxios';
import { useNotification } from '../context/NotificationContext';
import { AlertTriangle, ShieldCheck, Timer, CheckCircle } from 'lucide-react';
import SLATimer from '../components/SLATimer';

const SlaMonitoring = () => {
  const api = useAxios();
  const { showNotification } = useNotification();
  
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalMonitored: 0,
    compliantCount: 0,
    breachedCount: 0,
    complianceRate: 100
  });
  const [breaches, setBreaches] = useState([]);
  const [trackedTasks, setTrackedTasks] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const fetchSlaData = async () => {
      try {
        setLoading(true);
        const [metricsRes, breachesRes, ticketsRes] = await Promise.all([
          api.get('/api/admin/sla/metrics'),
          api.get('/api/admin/sla/breaches'),
          api.get('/api/tickets').catch(() => ({ data: [] }))
        ]);

        if (!isMounted) return;

        const mData = metricsRes.data?.data || metricsRes.data || {};
        const bData = breachesRes.data?.data || breachesRes.data || [];
        const ticketData = ticketsRes.data?.data?.tickets || ticketsRes.data?.data || ticketsRes.data || [];

        setMetrics(prev => ({ ...prev, ...mData }));
        setBreaches(Array.isArray(bData) ? bData : []);
        setTrackedTasks(Array.isArray(ticketData) ? ticketData : []);
      } catch (error) {
        console.error("Failed to fetch SLA data", error);
        if (isMounted) showNotification("Failed to load SLA monitoring data", "error");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSlaData();
    return () => { isMounted = false; };
  }, []);

  // ==========================================
  // DYNAMIC TICKET SORTER (THE FIX)
  // ==========================================
  const displayBreachesMap = new Map();
    
  // 1. Add all backend-confirmed breaches to the table
  breaches.forEach(ticket => displayBreachesMap.set(ticket.id, ticket));

  // 2. Check live tracked tasks to catch any real-time overdue tickets
  const activeLiveTasks = [];

  trackedTasks.forEach(task => {
    const isStatusActive = task.status === 'IN_PROGRESS' || task.status === 'INPROGRESS';
    if (!isStatusActive) return;

    // Calculate if the exact deadline has passed right now
    const deadlineTime = new Date(task.slaDeadline || task.deadline).getTime();
    const isTimeUp = deadlineTime && deadlineTime <= Date.now();
    
    // If it's flagged as breached, overdue, or the clock literally ran out
    if (task.slaBreachedAt || task.isOverdue || isTimeUp) {
      displayBreachesMap.set(task.id, task); // Force it into the Breaches table
    } else {
      activeLiveTasks.push(task); // Keep it in Live Tracking
    }
  });

  const finalBreachesList = Array.from(displayBreachesMap.values());


  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div>
          <div className="h-9 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg mb-2"></div>
          <div className="h-4 w-72 bg-gray-100 dark:bg-gray-800/50 rounded-lg"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-200 dark:border-gray-800"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">SLA Monitoring</h1>
        <p className="text-gray-500 mt-1">Track response times, service level agreements, and breached deadlines.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#1a1d27] p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl">
            <Timer size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500">Monitored Tasks</p>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">{metrics.totalMonitored || 0}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a1d27] p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl">
            <ShieldCheck size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500">Compliance Rate</p>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">{metrics.complianceRate ?? 100}%</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a1d27] p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 flex items-center gap-4">
          <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 rounded-xl">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500">Active Breaches</p>
            {/* Now uses the guaranteed full list of breaches */}
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">{finalBreachesList.length}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1a1d27] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 space-y-6">
        
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">SLA Breaches & Overdue Tickets</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <th className="py-3 px-4">Tracking No.</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Assignee</th>
                <th className="py-3 px-4">Deadline</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50 text-sm">
              {finalBreachesList.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CheckCircle size={32} className="text-emerald-500" />
                      <span>No active SLA breaches. All systems operating within targets.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                finalBreachesList.map(ticket => (
                  <tr key={ticket.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="py-4 px-4 font-bold text-gray-900 dark:text-white">{ticket.trackingNumber || ticket.trackNo}</td>
                    <td className="py-4 px-4 text-gray-700 dark:text-gray-300 font-medium">{ticket.title}</td>
                    <td className="py-4 px-4 text-gray-600 dark:text-gray-400">
                      {ticket.assignee ? `${ticket.assignee.firstName || ''} ${ticket.assignee.lastName || ''}` : 'Unassigned'}
                    </td>
                    <td className="py-4 px-4 text-red-600 font-medium text-xs">
                      {ticket.slaDeadline || ticket.deadline ? new Date(ticket.slaDeadline || ticket.deadline).toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
                        BREACHED
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Uses the newly filtered activeLiveTasks array */}
        {activeLiveTasks.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
            <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-300">Live SLA Tracking</h2>
            <div className="mt-3 space-y-2">
              {activeLiveTasks.map(task => (
                <div key={task.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/70 px-3 py-2 text-sm dark:bg-[#13151c]/70">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{task.title}</p>
                    <p className="text-xs text-gray-500">{task.trackingNumber || task.id}</p>
                  </div>
                  <SLATimer
                    status={task.status}
                    deadline={task.slaDeadline || task.deadline}
                    startedAt={task.slaStartedAt || task.startedAt}
                    durationHours={task.slaDurationHours || task.estimatedHours}
                    compact
                  />
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default SlaMonitoring;