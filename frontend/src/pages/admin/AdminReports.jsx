import { useState, useEffect } from "react";
import useAxios from "../../hooks/useAxios";
import { useNotification } from "../../context/NotificationContext";
import { BarChart3, Calendar, CheckCircle2, PlusCircle, Users, RefreshCw, Printer, Activity, FileText, Clock, UserCheck } from 'lucide-react';

const AdminReports = () => {
  const api = useAxios();
  const { showNotification } = useNotification();

  const [report, setReport] = useState(null);
  const [timeInterval, setTimeInterval] = useState('WEEKLY'); 
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReport = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const timestamp = new Date().getTime();
      const response = await api.get(`/api/admin/reports?_t=${timestamp}`, {
        params: { interval: timeInterval }
      });

      const reportData = response.data?.data?.report || response.data?.report || response.data;
      setReport(reportData);
    } catch (error) {
      console.error("Failed to generate report", error);
      showNotification("Failed to generate performance report", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [timeInterval]);

  const handlePrint = () => {
    window.print();
  };

  if (loading && !report) {
    return (
      <div className="space-y-6 animate-pulse">
        <div>
          <div className="h-9 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg mb-2"></div>
          <div className="h-4 w-72 bg-gray-100 dark:bg-gray-800/50 rounded-lg"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-[#1a1d27] rounded-2xl p-6 border border-gray-200 dark:border-gray-800 h-32"></div>
          ))}
        </div>
        <div className="h-64 w-full bg-white dark:bg-[#1a1d27] rounded-2xl border border-gray-200 dark:border-gray-800 mt-6"></div>
      </div>
    );
  }

  const metrics = report?.metrics || { ticketsCompleted: 0, newTicketsCreated: 0, uniqueActiveUsers: 0 };
  const activities = report?.activities || report?.tickets || [];

  // =========================================================
  // DYNAMIC EMPLOYEE PERFORMANCE AGGREGATOR
  // =========================================================
  const employeeStatsMap = {};

  activities.forEach(activity => {
    // Determine assignee name safely
    const assigneeName = activity.assignee 
      ? `${activity.assignee.firstName || ''} ${activity.assignee.lastName || ''}`.trim() || 'Unknown Employee'
      : activity.user || 'Unassigned';

    // Initialize employee if not exists
    if (!employeeStatsMap[assigneeName]) {
      employeeStatsMap[assigneeName] = { 
        name: assigneeName, 
        completed: 0, 
        projectsLeft: 0, 
        totalHandled: 0 
      };
    }

    // Increment total assigned
    employeeStatsMap[assigneeName].totalHandled += 1;

    // Check status to categorize
    const status = activity.status || activity.eventType || '';
    if (status === 'COMPLETED' || status === 'DONE') {
      employeeStatsMap[assigneeName].completed += 1;
    } else {
      // If it's IN_PROGRESS, PENDING, BLOCKED, or anything else, it's a project they are left with
      employeeStatsMap[assigneeName].projectsLeft += 1;
    }
  });

  // Convert map to sorted array (Most completed first)
  const employeeBreakdown = Object.values(employeeStatsMap).sort((a, b) => b.completed - a.completed);


  return (
    <div className="space-y-6">
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Performance Reports</h1>
          <p className="text-gray-500 mt-1">Analyze operational metrics, task completions, and user activity.</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-white dark:bg-[#1a1d27] border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 shadow-sm">
            <Calendar size={16} className="text-gray-400" />
            <select 
              value={timeInterval}
              onChange={(e) => setTimeInterval(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-gray-900 dark:text-white cursor-pointer"
            >
              <option className="bg-white dark:bg-gray-800" value="DAILY">Daily (24h)</option>
              <option className="bg-white dark:bg-gray-800" value="WEEKLY">Weekly (7 Days)</option>
              <option className="bg-white dark:bg-gray-800" value="MONTHLY">Monthly (30 Days)</option>
            </select>
          </div>

          <button 
            onClick={() => fetchReport(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700 text-white rounded-xl font-medium transition-colors shadow-sm"
          >
            <Printer size={16} />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* PRINTABLE REPORT DOCUMENT CONTAINER */}
      <div className="relative overflow-hidden bg-white dark:bg-[#1a1d27] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 md:p-8 space-y-6 print:border-none print:shadow-none print:p-0 print:bg-white print:text-black">
        
        {/* Background Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
          <span className="text-6xl md:text-9xl font-black text-gray-900/[0.03] dark:text-white/[0.03] print:text-gray-900/[0.05] tracking-widest uppercase rotate--12">
            NEXORATEL
          </span>
        </div>

        {/* Company Header */}
        <div className="hidden print:flex justify-between items-center border-b border-gray-200 pb-6 mb-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg">
              N
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Nexoratel IT Portal</h2>
              <p className="text-xs text-gray-500">Official Operational Performance & Analytics Report</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-gray-500">Generated On</p>
            <p className="text-sm font-bold text-gray-900">{new Date().toLocaleString()}</p>
          </div>
        </div>

        {/* Report Time Frame Banner */}
        <div className="relative z-10 bg-gray-50 dark:bg-[#13151c] print:bg-gray-50 rounded-2xl border border-gray-200 dark:border-gray-700/60 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 print:bg-indigo-50 print:text-indigo-600 flex items-center justify-center font-bold">
              <BarChart3 size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-white print:text-gray-900">
                {timeInterval === 'DAILY' ? 'Daily Report Summary' : timeInterval === 'WEEKLY' ? 'Weekly Report Summary' : 'Monthly Report Summary'}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Showing analytics window from <span className="font-semibold text-gray-700 dark:text-gray-300 print:text-gray-800">{report?.startDate ? new Date(report.startDate).toLocaleDateString() : 'N/A'}</span> to <span className="font-semibold text-gray-700 dark:text-gray-300 print:text-gray-800">{report?.endDate ? new Date(report.endDate).toLocaleDateString() : 'Present'}</span>
              </p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 print:bg-indigo-100 print:text-indigo-800 border border-indigo-200 dark:border-indigo-800/50 uppercase">
            {report?.interval || timeInterval}
          </span>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          <div className="bg-white dark:bg-[#1a1d27] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 flex items-center gap-4 print:border-gray-300">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 print:bg-emerald-50 print:text-emerald-600 rounded-xl">
              <CheckCircle2 size={28} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 print:text-gray-500 uppercase tracking-wider">Tickets Completed</p>
              <h3 className="text-3xl font-black text-gray-900 dark:text-white print:text-gray-900 mt-1">{metrics.ticketsCompleted}</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1a1d27] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 flex items-center gap-4 print:border-gray-300">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 print:bg-blue-50 print:text-blue-600 rounded-xl">
              <PlusCircle size={28} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 print:text-gray-500 uppercase tracking-wider">New Tickets Created</p>
              <h3 className="text-3xl font-black text-gray-900 dark:text-white print:text-gray-900 mt-1">{metrics.newTicketsCreated}</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1a1d27] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 flex items-center gap-4 print:border-gray-300">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 print:bg-purple-50 print:text-purple-600 rounded-xl">
              <Users size={28} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 print:text-gray-500 uppercase tracking-wider">Active Team Members</p>
              <h3 className="text-3xl font-black text-gray-900 dark:text-white print:text-gray-900 mt-1">{metrics.uniqueActiveUsers}</h3>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* NEW: EMPLOYEE PERFORMANCE BREAKDOWN                         */}
        {/* ========================================================= */}
        <div className="relative z-10 mt-8 pt-8 border-t border-gray-200 dark:border-gray-800 print:border-gray-300">
          <div className="flex items-center gap-2 mb-6">
            <UserCheck className="text-blue-500" size={20} />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white print:text-black">Employee Performance Breakdown</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employeeBreakdown.length === 0 ? (
              <p className="text-gray-500 text-sm col-span-full">No employee data available for this timeframe.</p>
            ) : (
              employeeBreakdown.map((emp, idx) => (
                <div key={idx} className="bg-white dark:bg-[#1a1d27] print:bg-white border border-gray-200 dark:border-gray-700 print:border-gray-300 rounded-xl p-4 shadow-sm print:shadow-none">
                  <p className="font-bold text-gray-900 dark:text-white print:text-black mb-3 border-b border-gray-100 dark:border-gray-800 pb-2 truncate">
                    {emp.name}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Finished</p>
                      <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{emp.completed}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Left With</p>
                      <p className="text-xl font-black text-amber-600 dark:text-amber-400">{emp.projectsLeft}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* DETAILED ACTIVITY LOG                                     */}
        {/* ========================================================= */}
        <div className="relative z-10 mt-8 pt-8 border-t border-gray-200 dark:border-gray-800 print:border-gray-300">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="text-indigo-500" size={20} />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white print:text-black">Detailed Operational Log</h3>
          </div>

          {activities.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 dark:bg-gray-800/30 print:bg-gray-50 rounded-xl border border-gray-200 dark:border-gray-800 border-dashed">
              <FileText className="mx-auto text-gray-400 mb-2" size={32} />
              <p className="text-gray-500 font-medium">No recorded operations or activities within this time frame.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 print:border-gray-300 text-xs font-semibold text-gray-500 print:text-gray-600 uppercase tracking-wider bg-gray-50 dark:bg-gray-800/50 print:bg-gray-100">
                    <th className="py-3 px-4 rounded-tl-lg">Date & Time</th>
                    <th className="py-3 px-4">Tracking No.</th>
                    <th className="py-3 px-4">Activity Description</th>
                    <th className="py-3 px-4">Status / Event</th>
                    <th className="py-3 px-4 rounded-tr-lg">Assignee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 print:divide-gray-200 text-sm">
                  {activities.map((activity, index) => (
                    <tr key={activity.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 print:hover:bg-transparent transition-colors">
                      <td className="py-4 px-4 text-gray-600 dark:text-gray-400 print:text-gray-700 flex items-center gap-2 whitespace-nowrap">
                        <Clock size={14} className="text-gray-400" />
                        {new Date(activity.createdAt || activity.updatedAt).toLocaleString()}
                      </td>
                      <td className="py-4 px-4 font-bold text-gray-900 dark:text-white print:text-black whitespace-nowrap">
                        {activity.trackingNumber || activity.trackNo || "System Event"}
                      </td>
                      <td className="py-4 px-4 text-gray-700 dark:text-gray-300 print:text-gray-800 font-medium">
                        {activity.title || activity.description || "Updated Ticket Information"}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-md uppercase border 
                          ${activity.status === 'COMPLETED' || activity.status === 'DONE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 print:bg-emerald-100 print:border-emerald-300' : 
                          activity.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border-blue-200 print:bg-blue-100 print:border-blue-300' : 
                          activity.status === 'BLOCKED' ? 'bg-red-50 text-red-700 border-red-200 print:bg-red-100 print:border-red-300' : 
                          'bg-gray-50 text-gray-700 border-gray-200 print:bg-gray-100 print:border-gray-300'}`}>
                          {activity.status || activity.eventType || "UPDATED"}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-gray-600 dark:text-gray-400 print:text-gray-700">
                        {activity.assignee ? `${activity.assignee.firstName || ''} ${activity.assignee.lastName || ''}` : activity.user || 'Unassigned'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer info visible only on print */}
        <div className="hidden print:flex justify-between items-center pt-8 mt-8 border-t border-gray-300 text-xs text-gray-500 relative z-10">
          <p>Nexoratel IT Portal — Confidential Corporate Report</p>
          <p>Authorized Administrator Access Only</p>
        </div>

      </div>
    </div>
  );
};

export default AdminReports;