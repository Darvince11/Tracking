import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import useAxios from '../../hooks/useAxios';
import { useNotification } from '../../context/NotificationContext';
import { FileText, Send, ArrowLeft, Clock3 } from 'lucide-react';

const EmployeeJournalPage = () => {
  const api = useAxios();
  const { showNotification } = useNotification();

  const [logs, setLogs] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);

      const [ticketsRes, logsRes] = await Promise.all([
        api.get('/api/tickets').catch(() => ({ data: [] })),
        api.get('/api/activity-logs/me').catch(() => api.get('/api/activity-logs').catch(() => ({ data: [] })))
      ]);

      const normalizedTickets = Array.isArray(ticketsRes.data?.data?.tickets)
        ? ticketsRes.data.data.tickets
        : Array.isArray(ticketsRes.data?.data)
          ? ticketsRes.data.data
          : Array.isArray(ticketsRes.data?.tickets)
            ? ticketsRes.data.tickets
            : [];

      const normalizedLogs = Array.isArray(logsRes.data?.data?.logs)
        ? logsRes.data.data.logs
        : Array.isArray(logsRes.data?.data)
          ? logsRes.data.data
          : Array.isArray(logsRes.data?.logs)
            ? logsRes.data.logs
            : [];

      setTickets(normalizedTickets);
      setLogs(normalizedLogs);
    } catch (error) {
      console.error('Failed to load journal data', error);
      showNotification('Failed to load your daily journal', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!content.trim()) return;

    try {
      setSubmitting(true);
      await api.post('/api/activity-logs', {
        content,
        ticketId: selectedTicketId || null
      });
      setContent('');
      setSelectedTicketId('');
      await fetchData();
      showNotification('Journal entry saved', 'success');
    } catch (error) {
      console.error('Failed to submit journal entry', error);
      showNotification('Failed to save journal entry', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const sortedLogs = useMemo(() => [...logs].sort((a, b) => new Date(b.logDate || b.createdAt || 0) - new Date(a.logDate || a.createdAt || 0)), [logs]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Daily Journal</h1>
          <p className="text-gray-500 mt-1">Capture your progress and keep a personal record of your work.</p>
        </div>
        <Link to="/employee" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
          <ArrowLeft size={16} /> Back to dashboard
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-[#1a1d27]">
          <div className="mb-4 flex items-center gap-2">
            <FileText size={18} className="text-indigo-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">New Entry</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Link to Ticket</label>
              <select
                value={selectedTicketId}
                onChange={(event) => setSelectedTicketId(event.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-[#13151c] dark:text-white"
              >
                <option value="">General note</option>
                {tickets.filter((ticket) => ticket.status !== 'COMPLETED').map((ticket) => (
                  <option key={ticket.id} value={ticket.id}>
                    {ticket.trackingNumber || ticket.id} - {ticket.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Your update</label>
              <textarea
                rows="8"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="What did you work on today?"
                className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 p-3 text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-[#13151c] dark:text-white"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={16} /> {submitting ? 'Saving...' : 'Save Entry'}
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-[#1a1d27]">
          <div className="mb-4 flex items-center gap-2">
            <Clock3 size={18} className="text-emerald-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Entries</h2>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-16 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
              ))}
            </div>
          ) : sortedLogs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500 dark:border-gray-700">
              No daily journal entries yet.
            </div>
          ) : (
            <div className="space-y-3">
              {sortedLogs.map((log) => (
                <div key={log.id} className="rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/40">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                      {log.ticket?.trackingNumber || 'General'}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      {new Date(log.logDate || log.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{log.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeJournalPage;
