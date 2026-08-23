import { useState, useEffect } from 'react';
import useAxios from '../../hooks/useAxios';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { Plus, Clock, X } from 'lucide-react';

const EmployeeTickets = () => {
  const api = useAxios();
  const { showNotification } = useNotification();
  const { user } = useAuth();
  
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    estimatedHours: '',
    department: user?.department || 'WEB_DEVELOPMENT' 
  });

  useEffect(() => {
    let isMounted = true;

    const fetchTickets = async () => {
      try {
        setLoading(true);
        // Note: Ensure your backend /api/tickets endpoint fetches all team tickets 
        // instead of filtering strictly by req.user.id so everyone shares the view.
        const response = await api.get('/api/tickets');
        
        if (!isMounted) return;

        const rawData = response.data;
        let finalTickets = [];
        if (Array.isArray(rawData)) finalTickets = rawData;
        else if (Array.isArray(rawData?.data)) finalTickets = rawData.data;
        else if (Array.isArray(rawData?.data?.tickets)) finalTickets = rawData.data.tickets;
        else if (Array.isArray(rawData?.tickets)) finalTickets = rawData.tickets;
        
        setTickets(finalTickets);
      } catch (error) {
        console.error("Failed to fetch tickets", error);
        if (isMounted) showNotification("Failed to load tickets", "error");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTickets();

    return () => {
      isMounted = false;
    };
  }, [refreshTrigger, api, showNotification]); 

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    
    try {
      const payload = {
        title: newTicket.title,
        description: newTicket.description,
        department: newTicket.department,
        priority: newTicket.priority.toUpperCase(),
        estimatedHours: Number(newTicket.estimatedHours)
      };

      await api.post('/api/tickets', payload);
      
      setRefreshTrigger(prev => prev + 1); 
      
      setIsModalOpen(false);
      
      setNewTicket({ 
        title: '', 
        description: '', 
        priority: 'MEDIUM', 
        estimatedHours: '',
        department: user?.department || 'WEB_DEVELOPMENT'
      });
      
      showNotification("Ticket created successfully!", "success");
      
    } catch (error) {
      const validationErrors = error.response?.data?.errors;
      if (validationErrors && validationErrors.length > 0) {
        showNotification(`Validation Error: ${validationErrors[0].message}`, "error");
      } else {
        const msg = error.response?.data?.message || "Failed to create ticket";
        showNotification(msg, "error");
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  // ==========================================
  // SKELETON LOADER
  // ==========================================
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse mb-2"></div>
            <div className="h-4 w-72 bg-gray-100 dark:bg-gray-800/50 rounded-lg animate-pulse"></div>
          </div>
          <div className="h-10 w-32 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white dark:bg-[#1a1d27] rounded-xl p-5 border border-gray-200 dark:border-gray-800 flex flex-col h-full animate-pulse">
              <div className="flex justify-between items-start mb-4">
                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
              </div>
              <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
              <div className="space-y-2 flex-1 mt-2">
                <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded"></div>
                <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded"></div>
                <div className="h-3 w-2/3 bg-gray-100 dark:bg-gray-800 rounded"></div>
              </div>
              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between">
                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Team Tickets</h1>
          <p className="text-gray-500 mt-1">View collective tasks, department requests, and collaborative items.</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-sm"
        >
          <Plus size={18} />
          <span>New Ticket</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tickets.length === 0 ? (
          <div className="col-span-full p-8 text-center bg-gray-50 dark:bg-[#1a1d27] rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 text-gray-500">
            No team tickets available. Create one to get started!
          </div>
        ) : (
          tickets.map(ticket => (
            <div key={ticket.id} className="bg-white dark:bg-[#1a1d27] rounded-xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col h-full hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {ticket.trackingNumber}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
                  ticket.status === 'COMPLETED' || ticket.status === 'DONE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' :
                  ticket.status === 'BLOCKED' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' : 
                  'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
                }`}>
                  {ticket.status.replace('_', ' ')}
                </span>
              </div>
              
              <div className="flex-1">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">{ticket.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-3">
                  {ticket.description}
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center text-sm text-gray-500">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${
                    ticket.priority === 'URGENT' ? 'bg-red-500' :
                    ticket.priority === 'HIGH' ? 'bg-orange-500' :
                    ticket.priority === 'MEDIUM' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}></span>
                  <span>{ticket.priority}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={14} />
                  <span>{ticket.estimatedHours} hrs est.</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1a1d27] border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Create New Ticket</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ticket Title</label>
                <input 
                  type="text" required 
                  value={newTicket.title}
                  onChange={(e) => setNewTicket({...newTicket, title: e.target.value})}
                  className="w-full p-2.5 bg-gray-50 dark:bg-[#13151c] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="E.g., Update login page UI"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea 
                  required rows="3"
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                  className="w-full p-2.5 bg-gray-50 dark:bg-[#13151c] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="Describe the task or issue in detail..."
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
                <select 
                  value={newTicket.department}
                  onChange={(e) => setNewTicket({...newTicket, department: e.target.value})}
                  className="w-full p-2.5 bg-gray-50 dark:bg-[#13151c] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                >
                  <option value="WEB_DEVELOPMENT">Web Development</option>
                  <option value="CYBERSECURITY">Cybersecurity</option>
                  <option value="CLOUD_COMPUTING">Cloud Computing</option>
                  <option value="POS_SYSTEMS">POS Systems</option>
                  <option value="NETWORKING">Networking</option>
                  <option value="DATA_ANALYTICS">Data Analytics</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                  <select 
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket({...newTicket, priority: e.target.value})}
                    className="w-full p-2.5 bg-gray-50 dark:bg-[#13151c] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
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
                    type="number" required min="1" step="0.5"
                    value={newTicket.estimatedHours}
                    onChange={(e) => setNewTicket({...newTicket, estimatedHours: e.target.value})}
                    className="w-full p-2.5 bg-gray-50 dark:bg-[#13151c] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    placeholder="E.g., 3"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t dark:border-gray-800 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitLoading} 
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:bg-indigo-400 disabled:cursor-not-allowed shadow-sm"
                >
                  {submitLoading ? 'Creating...' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeTickets;