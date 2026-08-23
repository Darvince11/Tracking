import { useState, useEffect } from 'react';
import useAxios from '../../hooks/useAxios';
import { useNotification } from '../../context/NotificationContext';
import { Search, User, Mail, Briefcase, Shield, CheckCircle2, Clock, AlertOctagon, Target } from 'lucide-react';

const EmployeeTracking = () => {
  const api = useAxios();
  const { showNotification } = useNotification();

  const [users, setUsers] = useState([]);
  const [allTickets, setAllTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardData = async () => {
      try {
        if (isMounted) setLoading(true);
        
        const [usersRes, ticketsRes] = await Promise.all([
          api.get('/api/admin/users'),
          api.get('/api/tickets')
        ]);
        
        if (!isMounted) return;

        const rawU = usersRes.data;
        let finalUsers = [];
        if (Array.isArray(rawU)) finalUsers = rawU;
        else if (Array.isArray(rawU?.data)) finalUsers = rawU.data;
        else if (Array.isArray(rawU?.data?.users)) finalUsers = rawU.data.users;
        else if (Array.isArray(rawU?.users)) finalUsers = rawU.users;
        
        const rawT = ticketsRes.data;
        let finalTickets = [];
        if (Array.isArray(rawT)) finalTickets = rawT;
        else if (Array.isArray(rawT?.data)) finalTickets = rawT.data;
        else if (Array.isArray(rawT?.data?.tickets)) finalTickets = rawT.data.tickets;
        else if (Array.isArray(rawT?.tickets)) finalTickets = rawT.tickets;

        setUsers(finalUsers.filter(u => u.status !== 'LOCKED'));
        setAllTickets(finalTickets);
      } catch (error) {
        console.error("Failed to fetch tracking data", error);
        if (isMounted) showNotification("Failed to load tracking data", "error");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDashboardData();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const filteredUsers = searchQuery 
    ? users.filter(u => 
        (u.firstName + ' ' + u.lastName).toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.department?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : users;

  const userTickets = allTickets.filter(t => t.assignedToId === selectedUser?.id);
  const completedProjects = userTickets.filter(t => t.status === 'DONE' || t.status === 'COMPLETED');
  const activeProjects = userTickets.filter(t => !['DONE', 'COMPLETED'].includes(t.status));
  const blockedProjects = activeProjects.filter(t => t.status === 'BLOCKED');

  const getInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || 'U';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Employee Tracking</h1>
        <p className="text-gray-500 mt-1">Select an employee to view their profile details, current assignments, and past projects.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 overflow-hidden">
        
        <div className="w-full lg:w-1/3 bg-white dark:bg-[#1a1d27] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden h-[400px] lg:h-full">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search by name, email, or dept..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-[#13151c] border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {/* ========================================== */}
            {/* DIRECTORY SKELETON LOADER                  */}
            {/* ========================================== */}
            {loading ? (
              <div className="space-y-1">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="w-full p-3 rounded-xl flex items-center gap-3 animate-pulse border border-transparent">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      <div className="h-2 w-20 bg-gray-100 dark:bg-gray-800 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">No employees found.</div>
            ) : (
              <ul className="space-y-1">
                {filteredUsers.map(user => (
                  <li key={user.id}>
                    <button
                      onClick={() => setSelectedUser(user)}
                      className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-colors ${
                        selectedUser?.id === user.id 
                          ? 'bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/50' 
                          : 'hover:bg-gray-50 dark:hover:bg-[#13151c] border border-transparent'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${
                        selectedUser?.id === user.id ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}>
                        {getInitials(user.firstName, user.lastName)}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">
                          {user.firstName} {user.lastName}
                        </h4>
                        <p className="text-xs text-gray-500 truncate">{user.department || 'No Department'}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="w-full lg:w-2/3 bg-white dark:bg-[#1a1d27] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden h-[600px] lg:h-full">
          {!selectedUser ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600 p-8 text-center">
              <User size={64} className="mb-4 opacity-50" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Select an Employee</h2>
              <p className="text-sm">Choose a team member from the directory to view their full profile, current workload, and past projects.</p>
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-y-auto">
              
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <div className="w-24 h-24 rounded-full border-4 border-white/20 bg-white dark:bg-gray-800 flex items-center justify-center text-3xl font-bold text-indigo-600 dark:text-indigo-400 shadow-lg shrink-0">
                  {getInitials(selectedUser.firstName, selectedUser.lastName)}
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="text-2xl font-bold mb-1">{selectedUser.firstName} {selectedUser.lastName}</h2>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-3 text-sm text-indigo-100">
                    <div className="flex items-center gap-1.5"><Shield size={16} /> {selectedUser.role}</div>
                    <div className="flex items-center gap-1.5"><Briefcase size={16} /> {selectedUser.department || 'N/A'}</div>
                    <div className="flex items-center gap-1.5"><Mail size={16} /> {selectedUser.email}</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#13151c]/50">
                <div className="bg-white dark:bg-[#1a1d27] p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm text-center">
                  <div className="text-gray-500 mb-1 flex justify-center"><Target size={20} /></div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{userTickets.length}</h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">Total Assigned</p>
                </div>
                <div className="bg-white dark:bg-[#1a1d27] p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm text-center">
                  <div className="text-emerald-500 mb-1 flex justify-center"><CheckCircle2 size={20} /></div>
                  <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{completedProjects.length}</h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">Completed</p>
                </div>
                <div className="bg-white dark:bg-[#1a1d27] p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 shadow-sm text-center relative overflow-hidden">
                  <div className={`${blockedProjects.length > 0 ? 'text-red-500' : 'text-blue-500'} mb-1 flex justify-center`}>
                    {blockedProjects.length > 0 ? <AlertOctagon size={20} /> : <Clock size={20} />}
                  </div>
                  <h3 className={`text-2xl font-bold ${blockedProjects.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                    {activeProjects.length}
                  </h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">Active Tasks</p>
                </div>
              </div>

              <div className="flex-1 p-6 space-y-8">
                
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Clock size={16} className="text-blue-500" /> Current Workload
                  </h3>
                  <div className="space-y-3">
                    {activeProjects.length === 0 ? (
                      <p className="text-sm text-gray-500 bg-gray-50 dark:bg-[#13151c] p-4 rounded-lg border border-dashed border-gray-200 dark:border-gray-800">
                        {selectedUser.firstName} has no active tasks right now.
                      </p>
                    ) : (
                      activeProjects.map(ticket => (
                        <div key={ticket.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-[#13151c] border border-gray-200 dark:border-gray-800 rounded-xl gap-4 hover:border-indigo-300 transition-colors">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{ticket.trackingNumber}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                ticket.priority === 'URGENT' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                ticket.priority === 'HIGH' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                              }`}>{ticket.priority}</span>
                            </div>
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white">{ticket.title}</h4>
                          </div>
                          <div className="shrink-0">
                            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                              ticket.status === 'BLOCKED' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' :
                              ticket.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' :
                              'bg-gray-50 text-gray-700 border-gray-200 dark:bg-[#1a1d27] dark:text-gray-300 dark:border-gray-700'
                            }`}>
                              {ticket.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500" /> Past Projects
                  </h3>
                  <div className="space-y-3">
                    {completedProjects.length === 0 ? (
                      <p className="text-sm text-gray-500 bg-gray-50 dark:bg-[#13151c] p-4 rounded-lg border border-dashed border-gray-200 dark:border-gray-800">
                        No completed projects on record.
                      </p>
                    ) : (
                      completedProjects.map(ticket => (
                        <div key={ticket.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50/50 dark:bg-[#13151c]/50 border border-gray-100 dark:border-gray-800 rounded-xl gap-4 opacity-80 hover:opacity-100 transition-opacity">
                          <div className="flex-1">
                            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 line-through decoration-gray-400/50">{ticket.title}</h4>
                            <p className="text-xs text-gray-500 mt-1">{ticket.trackingNumber}</p>
                          </div>
                          <div className="shrink-0 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500">
                            <CheckCircle2 size={16} />
                            <span className="text-xs font-bold uppercase">Done</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default EmployeeTracking;