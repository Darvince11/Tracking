import { useEffect, useMemo, useState } from 'react';
import useAxios from '../../hooks/useAxios';
import { useNotification } from '../../context/NotificationContext';
import { Search, FileText, Users } from 'lucide-react';

const AdminJournal = () => {
  const api = useAxios();
  const { showNotification } = useNotification();

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/admin/activity-logs').catch(() => ({ data: [] }));

        const normalized = Array.isArray(response.data?.data?.logs)
          ? response.data.data.logs
          : Array.isArray(response.data?.data)
            ? response.data.data
            : Array.isArray(response.data?.logs)
              ? response.data.logs
              : [];

        setEntries(normalized);
      } catch (error) {
        console.error('Failed to load admin journal entries', error);
        showNotification('Failed to load employee journal entries', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();
  }, []);

  const filteredEntries = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return entries;

    return entries.filter((entry) => {
      const userName = `${entry.user?.firstName || ''} ${entry.user?.lastName || ''}`.toLowerCase();
      const ticketRef = `${entry.ticket?.trackingNumber || ''}`.toLowerCase();
      const content = `${entry.content || ''}`.toLowerCase();
      return userName.includes(query) || ticketRef.includes(query) || content.includes(query);
    });
  }, [entries, searchTerm]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Employee Journal Oversight</h1>
        <p className="text-gray-500 mt-1">See what employees entered in their daily journal and follow up on key updates.</p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-[#1a1d27]">
        <div className="relative max-w-md">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search employee, ticket, or note..."
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-[#13151c] dark:text-white"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-[#1a1d27]">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-20 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
            ))}
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500 dark:border-gray-700">
            No journal entries found.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEntries.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/40">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-indigo-500" />
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {entry.user ? `${entry.user.firstName || ''} ${entry.user.lastName || ''}`.trim() : 'System'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <FileText size={14} />
                    <span>{entry.ticket?.trackingNumber || 'General'}</span>
                    <span>•</span>
                    <span>{new Date(entry.logDate || entry.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{entry.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminJournal;
