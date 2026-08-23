import { useState, useEffect } from 'react';
import useAxios from '../../hooks/useAxios';
import { Search, AlertCircle, Clock, Plus, X, Edit, Trash2, Activity } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

const TicketDirectory = () => {
  const api = useAxios();
  const { showNotification } = useNotification();
  
  const [tickets, setTickets] = useState([]);
  const [usersList, setUsersList] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals & Forms State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  
  const [newTicket, setNewTicket] = useState({
    title: '', 
    description: '', 
    priority: 'MEDIUM', 
    estimatedHours: 1, 
    department: '', 
    assignedToId: '' 
  });

  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [manageLoading, setManageLoading] = useState(false);
  const [activeTicket, setActiveTicket] = useState(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState(null);

  useEffect(() => {
    fetchTickets();
    fetchUsersForDropdown();
  }, []);

  // Upgraded Error Parser
  const parseBackendError = (error, defaultMessage) => {
    if (!error.response) {
      return `Network Error: ${error.message}. Is the backend running?`;
    }
    
    const data = error.response.data;
    
    if (typeof data === 'string') {
      return `Server Error (${error.response.status}): Check endpoint path or server logs.`;
    }
    
    let detailedError = data?.message || defaultMessage;
    
    if (data?.errors && Array.isArray(data.errors)) {
      detailedError = data.errors.map(err => err.message).join(', ');
    }
    
    return detailedError.replace(/['"]/g, '');
  };

  const fetchTickets = async () => {
    try {
      const response = await api.get('/api/admin/tickets/directory');
      const rawData = response.data;
      
      if (rawData?.data?.tickets) {
        setTickets(rawData.data.tickets);
      } else {
        setTickets([]);
      }
    } catch (error) {
      console.error("Failed to fetch tickets", error);
      const errorMessage = parseBackendError(error, "Failed to load ticket directory.");
      showNotification(`Directory Error: ${errorMessage}`, "error");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsersForDropdown = async () => {
    try {
      const response = await api.get('/api/admin/users');
      const rawData = response.data;
      
      if (rawData?.data?.users) {
        setUsersList(rawData.data.users);
      }
    } catch (error) {
      console.error("Failed to fetch users", error);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    
    try {
      const payload = {
        title: newTicket.title.trim(),
        description: newTicket.description.trim(),
        priority: newTicket.priority,
        estimatedHours: Number(newTicket.estimatedHours),
        department: newTicket.department,
        assignedToId: newTicket.assignedToId ? newTicket.assignedToId : null
      };

      await api.post('/api/admin/tickets', payload);
      
      setIsCreateModalOpen(false);
      setNewTicket({ title: '', description: '', priority: 'MEDIUM', estimatedHours: 1, department: '', assignedToId: '' });
      fetchTickets(); 
      showNotification("Ticket created successfully!", "success");
    } catch (error) {
      const errorMessage = parseBackendError(error, "Failed to create ticket.");
      showNotification(`Validation Error: ${errorMessage}`, "error");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdateTicket = async (e) => {
    e.preventDefault();
    setManageLoading(true);
    
    try {
      const payload = {
        status: activeTicket.status,
        priority: activeTicket.priority,
        assignedToId: activeTicket.assignedToId ? activeTicket.assignedToId : null
      };

      await api.patch(`/api/admin/tickets/${activeTicket.id}`, payload);
      
      setIsManageModalOpen(false);
      fetchTickets();
      showNotification("Ticket updated successfully!", "success");
    } catch (error) {
      const errorMessage = parseBackendError(error, "Failed to update ticket.");
      showNotification(`Validation Error: ${errorMessage}`, "error");
    } finally {
      setManageLoading(false);
    }
  };

  const openManageModal = (ticket) => {
    setActiveTicket({ 
      ...ticket,
      assignedToId: ticket.assignee?.id || ''
    });
    setIsManageModalOpen(true);
  };

  const handleDeleteClick = (id) => {
    setTicketToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!ticketToDelete) return;
    try {
      await api.delete(`/api/admin/tickets/${ticketToDelete}`);
      fetchTickets();
      showNotification("Ticket successfully deleted", "success");
    } catch (error) {
      const errorMessage = parseBackendError(error, "Failed to delete ticket.");
      showNotification(errorMessage, "error");
    } finally {
      setIsDeleteModalOpen(false);
      setTicketToDelete(null);
    }
  };

  const filteredTickets = tickets.filter(t => 
    t.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.trackingNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch(status) {
      case 'OPEN': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'IN_PROGRESS': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'BLOCKED': return 'bg-red-50 text-red-700 border-red-200';
      case 'UNDER_REVIEW': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'COMPLETED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'CANCELLED': return 'bg-gray-800 text-gray-300 border-gray-600';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getEfficiencyColor = (efficiency) => {
    if (!efficiency || efficiency === 0) return 'text-gray-400';
    if (efficiency <= 80) return 'text-emerald-600';
    if (efficiency <= 100) return 'text-amber-600';
    return 'text-red-600';
  };

  // ==========================================
  // TABLE SKELETON LOADER
  // ==========================================
  if (loading) {
    return (
      <div className="space-y-6 relative">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="h-9 w-64 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse mb-2"></div>
            <div className="h-4 w-96 max-w-full bg-gray-100 dark:bg-gray-800/50 rounded-lg animate-pulse"></div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <div className="h-10 w-full md:w-64 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse"></div>
            <div className="h-10 w-32 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse hidden md:block"></div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4"><div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div></th>
                <th className="px-6 py-4"><div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div></th>
                <th className="px-6 py-4"><div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div></th>
                <th className="px-6 py-4"><div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div></th>
                <th className="px-6 py-4 text-right"><div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ml-auto"></div></th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="border-b border-gray-50 dark:border-gray-700">
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2">
                      <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      <div className="h-3 w-48 bg-gray-100 dark:bg-gray-700/50 rounded animate-pulse"></div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2 items-start">
                      <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse"></div>
                      <div className="h-3 w-16 bg-gray-100 dark:bg-gray-700/50 rounded animate-pulse"></div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2">
                      <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      <div className="h-3 w-24 bg-gray-100 dark:bg-gray-700/50 rounded animate-pulse"></div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2">
                      <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      <div className="h-3 w-20 bg-gray-100 dark:bg-gray-700/50 rounded animate-pulse"></div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                      <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Ticket Directory</h1>
          <p className="text-gray-500 mt-1">Global view of all system tickets and operational status.</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input 
              type="text" 
              placeholder="Search Tracker or Title..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-sm"
          >
            <Plus size={16} />
            <span className="hidden md:inline">New Ticket</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-900/50 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
            <tr>
              <th className="px-6 py-4 font-semibold">Track ID & Title</th>
              <th className="px-6 py-4 font-semibold">Status & Priority</th>
              <th className="px-6 py-4 font-semibold">Assigned To</th>
              <th className="px-6 py-4 font-semibold">Efficiency</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.length === 0 ? (
              <tr><td colSpan="5" className="px-6 py-8 text-center">No tickets found.</td></tr>
            ) : (
              filteredTickets.map((ticket) => (
                <tr key={ticket.id} className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{ticket.trackingNumber}</span>
                      {ticket.isBlocked && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">BLOCKED</span>}
                    </div>
                    <div className="font-medium text-gray-900 dark:text-white line-clamp-1">{ticket.title}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2 items-start">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-md border ${getStatusColor(ticket.status)}`}>
                        {ticket.status?.replace('_', ' ')}
                      </span>
                      {ticket.priority === 'URGENT' && (
                        <span className="flex items-center gap-1 text-xs font-bold text-red-600"><AlertCircle size={12}/> URGENT</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 dark:text-gray-300">
                      {ticket.assignee ? `${ticket.assignee.firstName} ${ticket.assignee.lastName}` : 'Unassigned'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{(ticket.department || '').replace('_', ' ')}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-gray-400" />
                        <span className="font-medium text-gray-900 dark:text-gray-300">{ticket.actualHours || 0}h</span>
                        <span className="text-gray-400">/ {ticket.estimatedHours || 0}h</span>
                      </div>
                      <div className={`flex items-center gap-1 text-xs font-medium ${getEfficiencyColor(ticket.efficiency)}`}>
                        <Activity size={12} />
                        <span>{ticket.efficiency > 0 ? `${ticket.efficiency}% Utilized` : 'Not Started'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => openManageModal(ticket)}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Manage Ticket"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(ticket.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Ticket"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ADMIN CREATE TICKET MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Create New Ticket</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ticket Title</label>
                <input 
                  type="text" required minLength="5" maxLength="200"
                  value={newTicket.title}
                  onChange={(e) => setNewTicket({...newTicket, title: e.target.value})}
                  placeholder="Min 5 characters..."
                  className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea 
                  rows="3"
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                  className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                  <select 
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket({...newTicket, priority: e.target.value})}
                    className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estimated Hours</label>
                  <input 
                    type="number" step="0.5" min="0.5" required
                    value={newTicket.estimatedHours}
                    onChange={(e) => setNewTicket({...newTicket, estimatedHours: e.target.value})}
                    className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
                  <select 
                    required
                    value={newTicket.department}
                    onChange={(e) => setNewTicket({...newTicket, department: e.target.value})}
                    className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="" disabled>Select Department</option>
                    <option value="WEB_DEVELOPMENT">Web Development</option>
                    <option value="CYBERSECURITY">Cybersecurity</option>
                    <option value="CLOUD_COMPUTING">Cloud Computing</option>
                    <option value="POS_SYSTEMS">POS Systems</option>
                    <option value="NETWORKING">Networking</option>
                    <option value="DATA_ANALYTICS">Data Analytics</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assign To (Optional)</label>
                  <select 
                    value={newTicket.assignedToId}
                    onChange={(e) => setNewTicket({...newTicket, assignedToId: e.target.value})}
                    className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">Unassigned</option>
                    {usersList.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.firstName} {u.lastName} ({u.department})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700 mt-6">
                <button 
                  type="button" onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
                >Cancel</button>
                <button type="submit" disabled={createLoading} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium">
                  {createLoading ? 'Creating...' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN MANAGE TICKET MODAL */}
      {isManageModalOpen && activeTicket && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Manage: {activeTicket.trackingNumber}</h3>
              <button onClick={() => setIsManageModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleUpdateTicket} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Override Status</label>
                <select 
                  value={activeTicket.status}
                  onChange={(e) => setActiveTicket({...activeTicket, status: e.target.value})}
                  className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="BLOCKED">Blocked</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reassign Employee</label>
                <select 
                  value={activeTicket.assignedToId || ''}
                  onChange={(e) => setActiveTicket({...activeTicket, assignedToId: e.target.value})}
                  className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">Unassigned</option>
                  {usersList.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} - {u.role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700 mt-6">
                <button 
                  type="button" onClick={() => setIsManageModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg font-medium"
                >Cancel</button>
                <button type="submit" disabled={manageLoading} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium">
                  {manageLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in-up">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden p-6 text-center border border-gray-100 dark:border-gray-700">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} />
            </div>
            <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-2">Delete Ticket?</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm leading-relaxed">
              This action cannot be undone. All logs and associated time entries will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Delete Ticket
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TicketDirectory;