import { useState, useEffect } from 'react';
import useAxios from '../hooks/useAxios';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext'; 
import { Plus, Trash2, Lock, X, AlertTriangle } from 'lucide-react';
import SLATimer from '../components/SLATimer';

const TicketDashboard = () => {
  const api = useAxios();
  const { showNotification } = useNotification();
  const { user: currentUser } = useAuth(); 

  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    assignedToId: '', 
    department: currentUser?.department || 'WEB_DEVELOPMENT',
    priority: 'MEDIUM',
    estimatedHours: '',
    status: 'OPEN'
  });

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        if (isMounted) setLoading(true);
        
        // FIXED: Dynamically point to the correct endpoint based on role
        const endpoint = currentUser?.role === 'ADMIN' ? '/api/tickets/directory' : '/api/tickets/team-tickets';
        const ticketsRes = await api.get(endpoint);
        
        if (!isMounted) return;

        const rawT = ticketsRes.data;
        let finalTickets = [];
        if (Array.isArray(rawT)) finalTickets = rawT;
        else if (Array.isArray(rawT?.data)) finalTickets = rawT.data;
        else if (Array.isArray(rawT?.data?.tickets)) finalTickets = rawT.data.tickets;
        else if (Array.isArray(rawT?.tickets)) finalTickets = rawT.tickets;
        
        setTickets(finalTickets);

        // Try fetching users 
        try {
          const usersRes = await api.get('/api/admin/users');
          const rawU = usersRes.data;
          
          let finalUsers = [];
          if (Array.isArray(rawU)) finalUsers = rawU;
          else if (Array.isArray(rawU?.data)) finalUsers = rawU.data;
          else if (Array.isArray(rawU?.data?.users)) finalUsers = rawU.data.users;
          else if (Array.isArray(rawU?.users)) finalUsers = rawU.users;
          
          if (isMounted) setUsers(finalUsers);
        } catch {
          // Fallback for employees reading assignee objects directly from tickets
          const extractedUsersFromTickets = finalTickets
            .map(t => t.assignee || t.assignedTo)
            .filter(Boolean);
          if (isMounted) setUsers(extractedUsersFromTickets);
        }

      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
        if (isMounted) showNotification("Failed to load tickets", "error");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [refreshTrigger, currentUser, api, showNotification]); 

  const canAlterTicket = (ticket) => {
    if (!currentUser) return false;
    if (currentUser.role === 'ADMIN') return true;
    if (ticket.assignedToId === currentUser.id || ticket.assignee?.id === currentUser.id) return true;
    return false;
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    const previousTickets = [...tickets];
    setTickets(prev => prev.map(t => {
      if (t.id !== ticketId) return t;

      const updatedTicket = { ...t, status: newStatus };

      if (newStatus === 'IN_PROGRESS' && !t.slaStartedAt) {
        updatedTicket.slaStartedAt = new Date().toISOString();
      }

      if (newStatus === 'IN_PROGRESS' && !t.slaDeadline) {
        const hours = Number(t.slaDurationHours || t.estimatedHours || 4);
        updatedTicket.slaDeadline = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
      }

      return updatedTicket;
    }));

    try {
      // FIXED: Backend handles role checks securely; all updates hit /api/tickets/:id
      await api.patch(`/api/tickets/${ticketId}`, { status: newStatus });
      showNotification("Ticket status updated", "success");
    } catch (error) {
      setTickets(previousTickets); 
      console.error("Status update error:", error);
      showNotification("Failed to update status", "error");
    }
  };

  const handleSlaExpire = (ticketId) => {
    setTickets(prev => prev.map(ticket => ticket.id === ticketId ? { ...ticket, status: 'OVERDUE' } : ticket));
    showNotification('Task is now overdue and flagged for follow-up', 'warning');
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      // FIXED: Point directly to the root ticket endpoint
      const payload = {
        ...newTicket,
        estimatedHours: parseInt(newTicket.estimatedHours)
      };

      await api.post('/api/tickets', payload);
      
      setRefreshTrigger(prev => prev + 1); 
      
      setIsModalOpen(false);
      setNewTicket({ 
        title: '', description: '', assignedToId: '', department: currentUser?.department || 'WEB_DEVELOPMENT', priority: 'MEDIUM', estimatedHours: '', status: 'OPEN' 
      });
      showNotification("Ticket created successfully!", "success");
    } catch (error) {
      console.error("Creation error:", error);
      const msg = error.response?.data?.message || "Failed to create ticket";
      showNotification(msg, "error");
    } finally {
      setSubmitLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!ticketToDelete) return;
    
    setSubmitLoading(true);
    try {
      // FIXED: Route simplified as backend handles authorization 
      await api.delete(`/api/tickets/${ticketToDelete}`);
      setTickets(prev => prev.filter(t => t.id !== ticketToDelete));
      showNotification("Ticket deleted successfully", "success");
    } catch (error) {
      console.error("Deletion error:", error);
      showNotification("Failed to delete ticket", "error");
    } finally {
      setSubmitLoading(false);
      setTicketToDelete(null); 
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse mb-2"></div>
            <div className="h-4 w-96 max-w-full bg-gray-100 dark:bg-gray-800/50 rounded-lg animate-pulse"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(col => (
            <div key={col} className="flex flex-col bg-gray-50/50 dark:bg-[#13151c]/50 rounded-2xl border border-gray-100 dark:border-gray-800 h-[calc(100vh-12rem)] overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            {currentUser?.role === 'ADMIN' ? 'Ticket Directory' : 'Team Tickets'}
          </h1>
          <p className="text-gray-500 mt-1">View all company tasks. You can only edit tasks assigned to you.</p>
        </div>
        
        {currentUser?.role === 'ADMIN' && (
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-sm">
            <Plus size={18} /><span>New Ticket</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tickets.length === 0 ? (
          <div className="col-span-full p-8 text-center bg-gray-50 dark:bg-[#1a1d27] rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 text-gray-500">
            No tickets found.
          </div>
        ) : (
          tickets.map(ticket => {
            const hasAccess = canAlterTicket(ticket);
            
            const assignedUser = ticket.assignee || ticket.assignedTo || users.find(u => u.id === ticket.assignedToId);

            return (
              <div key={ticket.id} className={`bg-white dark:bg-[#1a1d27] rounded-xl p-5 border shadow-sm flex flex-col h-full relative overflow-hidden transition-all ${!hasAccess ? 'border-gray-200 dark:border-gray-800 opacity-90' : 'border-indigo-100 dark:border-indigo-900/30 hover:border-indigo-300 dark:hover:border-indigo-700'}`}>
                {!hasAccess && (
                  <div className="absolute top-4 right-4 text-gray-300 dark:text-gray-600" title="Read Only"><Lock size={16} /></div>
                )}
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white pr-6">{ticket.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-3">{ticket.description}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Assigned To:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-200">
                      {assignedUser ? `${assignedUser.firstName || ''} ${assignedUser.lastName || ''}`.trim() || assignedUser.name || 'Assigned' : 'Unassigned'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-gray-500">SLA</span>
                    <SLATimer
                      status={ticket.status}
                      deadline={ticket.slaDeadline || ticket.deadline}
                      startedAt={ticket.slaStartedAt || ticket.startedAt}
                      durationHours={ticket.slaDurationHours || ticket.estimatedHours}
                      onExpire={() => handleSlaExpire(ticket.id)}
                      compact
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <select
                      value={ticket.status}
                      onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                      disabled={!hasAccess}
                      className={`text-xs font-bold px-2 py-1.5 rounded-md border outline-none ${
                        ticket.status === 'DONE' || ticket.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' : 
                        ticket.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' : 
                        ticket.status === 'BLOCKED' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' :
                        'bg-gray-50 text-gray-700 border-gray-200 dark:bg-[#13151c] dark:text-gray-300 dark:border-gray-700'
                      } ${!hasAccess ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <option className="bg-white text-gray-900 dark:bg-gray-800 dark:text-white" value="OPEN">OPEN</option>
                      <option className="bg-white text-gray-900 dark:bg-gray-800 dark:text-white" value="IN_PROGRESS">IN PROGRESS</option>
                      <option className="bg-white text-gray-900 dark:bg-gray-800 dark:text-white" value="BLOCKED">BLOCKED</option>
                      <option className="bg-white text-gray-900 dark:bg-gray-800 dark:text-white" value="COMPLETED">COMPLETED</option>
                    </select>
                    {hasAccess && (
                      <div className="flex gap-2">
                        <button onClick={() => setTicketToDelete(ticket.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded bg-gray-50 hover:bg-red-50 dark:bg-[#13151c] dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1a1d27] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Assign New Ticket</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ticket Title</label>
                <input type="text" required value={newTicket.title} onChange={(e) => setNewTicket({...newTicket, title: e.target.value})} className="w-full p-2.5 bg-gray-50 dark:bg-[#13151c] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
                  <select required value={newTicket.department} onChange={(e) => setNewTicket({...newTicket, department: e.target.value})} className="w-full p-2.5 bg-gray-50 dark:bg-[#13151c] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
                    <option value="WEB_DEVELOPMENT">Web Development</option>
                    <option value="CYBERSECURITY">Cybersecurity</option>
                    <option value="CLOUD_COMPUTING">Cloud Computing</option>
                    <option value="POS_SYSTEMS">POS Systems</option>
                    <option value="NETWORKING">Networking</option>
                    <option value="DATA_ANALYTICS">Data Analytics</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assign To</label>
                  <select required value={newTicket.assignedToId} onChange={(e) => setNewTicket({...newTicket, assignedToId: e.target.value})} className="w-full p-2.5 bg-gray-50 dark:bg-[#13151c] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
                    <option value="" disabled>Select Member...</option>
                    {users.map(user => (
                      user.status !== 'LOCKED' && <option key={user.id || user._id} value={user.id || user._id}>{user.firstName} {user.lastName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                  <select required value={newTicket.priority} onChange={(e) => setNewTicket({...newTicket, priority: e.target.value})} className="w-full p-2.5 bg-gray-50 dark:bg-[#13151c] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estimated Hours</label>
                  <input type="number" min="1" required placeholder="e.g. 5" value={newTicket.estimatedHours} onChange={(e) => setNewTicket({...newTicket, estimatedHours: e.target.value})} className="w-full p-2.5 bg-gray-50 dark:bg-[#13151c] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea required rows="3" value={newTicket.description} onChange={(e) => setNewTicket({...newTicket, description: e.target.value})} className="w-full p-2.5 bg-gray-50 dark:bg-[#13151c] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"></textarea>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t mt-6 dark:border-gray-800">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 rounded-lg font-medium transition-colors">Cancel</button>
                <button type="submit" disabled={submitLoading} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:bg-indigo-400 shadow-sm">
                  {submitLoading ? 'Creating...' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {ticketToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-[#1a1d27] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-500 mb-4">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Ticket?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Are you sure you want to permanently delete this ticket? This action cannot be undone.
              </p>
              <div className="flex w-full gap-3">
                <button 
                  onClick={() => setTicketToDelete(null)} 
                  disabled={submitLoading}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete} 
                  disabled={submitLoading}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:bg-red-400"
                >
                  {submitLoading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TicketDashboard;
