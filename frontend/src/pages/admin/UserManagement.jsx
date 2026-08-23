import { useState, useEffect } from 'react';
import useAxios from '../../hooks/useAxios';
import { UserPlus, Shield, ShieldOff, Trash2, Mail, Briefcase, X, AlertCircle } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

const UserManagement = () => {
  const api = useAxios();
  const { showNotification } = useNotification();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Keeps track of which user is currently being updated so we can disable their buttons
  const [processingId, setProcessingId] = useState(null);

  // Create User Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'EMPLOYEE',
    department: '' 
  });

  // Delete Confirmation Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/api/admin/users');
      const raw = response.data;
      let extractedUsers = [];

      if (Array.isArray(raw)) {
        extractedUsers = raw;
      } else if (raw && typeof raw === 'object') {
        if (Array.isArray(raw.data)) extractedUsers = raw.data;
        else if (Array.isArray(raw.users)) extractedUsers = raw.users;
        else if (Array.isArray(raw.data?.users)) extractedUsers = raw.data.users;
        else if (Array.isArray(raw.data?.data)) extractedUsers = raw.data.data;
        else {
          const arrayKey = Object.keys(raw).find(key => Array.isArray(raw[key]));
          if (arrayKey) extractedUsers = raw[arrayKey];
        }
      }
      setUsers(extractedUsers);
    } catch (error) {
      console.error("Failed to fetch users", error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Empty dependency array guarantees this NEVER runs accidentally on re-renders!
  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Accessibility: Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsCreateModalOpen(false);
        setIsDeleteModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const updateUserStatus = async (id, action) => {
    setProcessingId(id); // Instantly disable the buttons for this row
    const targetStatus = action === 'activate' ? 'ACTIVE' : 'INACTIVE';

    try {
      await api.patch(`/api/admin/users/${id}/status`, { action: action });
      
      // Update local state smoothly. No background fetch to mess it up.
      setUsers(prev => prev.map(user => 
        user.id === id ? { ...user, status: targetStatus } : user
      ));

      showNotification(`User account ${action}d successfully`, "success"); 
    } catch (error) {
      console.error(`Error trying to ${action} user:`, error);
      const detailedError = error.response?.data?.message || error.response?.data?.error || `Failed to ${action} user`;
      showNotification(detailedError, "error");
    } finally {
      setProcessingId(null); // Re-enable buttons
    }
  };

  const handleDeleteClick = (id) => {
    setUserToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await api.delete(`/api/admin/users/${userToDelete}`);
      setUsers(prev => prev.filter(user => user.id !== userToDelete));
      showNotification("User successfully deleted", "success");
    } catch (error) {
      const detailedError = error.response?.data?.message || "Failed to delete user";
      showNotification(detailedError, "error");
    } finally {
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      const response = await api.post('/api/admin/users', newUser);
      
      // ✅ FIX: Correctly extract the actual user object from your backend's nested response!
      const newlyCreatedUser = response.data?.data?.user;

      if (newlyCreatedUser) {
         // Map the backend 'accountStatus' to 'status' so the table reads it correctly
         newlyCreatedUser.status = newlyCreatedUser.accountStatus || 'ACTIVE';
         setUsers(prev => [...prev, newlyCreatedUser]);
      } else {
         // Safe fallback: if we can't extract it, just refetch the whole list
         await fetchUsers();
      }

      setIsCreateModalOpen(false);
      setNewUser({ firstName: '', lastName: '', email: '', password: '', role: 'EMPLOYEE', department: '' });
      showNotification("User successfully created!", "success");
    } catch (error) {
      const data = error.response?.data;
      let detailedError = data?.message || "Validation failed";
      if (data?.details && Array.isArray(data.details)) {
        detailedError = data.details.map(d => d.message).join(', ');
      } else if (data?.errors && Array.isArray(data.errors)) {
        detailedError = data.errors.map(err => err.msg || err.message).join(', ');
      }
      showNotification(detailedError.replace(/['"]/g, ''), "error");
    } finally {
      setSubmitLoading(false);
    }
  };

  // ==========================================
  // TABLE SKELETON LOADER
  // ==========================================
  if (loading) {
    return (
      <div className="space-y-6 relative">
        {/* Header Skeleton */}
        <div className="flex justify-between items-end">
          <div>
            <div className="h-9 w-64 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse mb-2"></div>
            <div className="h-4 w-96 max-w-full bg-gray-100 dark:bg-gray-800/50 rounded-lg animate-pulse"></div>
          </div>
          <div className="h-10 w-32 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse"></div>
        </div>

        {/* Table Skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-4"><div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div></th>
                  <th className="px-6 py-4"><div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div></th>
                  <th className="px-6 py-4"><div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div></th>
                  <th className="px-6 py-4 text-right"><div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ml-auto"></div></th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="border-b border-gray-50 dark:border-gray-700">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse shrink-0"></div>
                        <div className="space-y-2">
                          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                          <div className="h-3 w-48 bg-gray-100 dark:bg-gray-700/50 rounded animate-pulse"></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        <div className="h-3 w-32 bg-gray-100 dark:bg-gray-700/50 rounded animate-pulse"></div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse"></div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                        <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                        <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse ml-1"></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">User Management</h1>
          <p className="text-gray-500 mt-1">Manage employee access, roles, and system permissions.</p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-sm"
        >
          <UserPlus size={18} />
          <span>New User</span>
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-900/50 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 font-semibold">Employee</th>
                <th className="px-6 py-4 font-semibold">Role & Dept</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan="4" className="px-6 py-8 text-center">No users found.</td></tr>
              ) : (
                users.map((user) => {
                  const displayStatus = String(user.status || 'ACTIVE').toUpperCase();
                  const isUserActive = displayStatus === 'ACTIVE';
                  const isProcessing = processingId === user.id; // Check if this specific user is updating

                  return (
                    <tr key={user.id} className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold uppercase">
                            {user.firstName?.charAt(0) || user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {user.firstName || user.name || 'Unknown'} {user.lastName || ''}
                            </div>
                            <div className="text-xs flex items-center gap-1 text-gray-500"><Mail size={12}/> {user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900 dark:text-gray-300">{user.role || 'EMPLOYEE'}</div>
                        <div className="text-xs flex items-center gap-1 text-gray-500 mt-0.5">
                          <Briefcase size={12}/> 
                          {(user.department || user.dept || 'N/A').replace('_', ' ')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-md border uppercase ${
                          isProcessing ? 'bg-gray-100 text-gray-500 border-gray-200' :
                          isUserActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800' 
                            : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:border-red-800'
                        }`}>
                          {isProcessing ? 'UPDATING...' : (isUserActive ? 'ACTIVE' : 'LOCKED')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          
                          {/* BUTTON 1: Activate */}
                          <button 
                            onClick={() => updateUserStatus(user.id, 'activate')}
                            disabled={isUserActive || isProcessing} 
                            className={`p-2 rounded-lg transition-colors ${
                              (isUserActive || isProcessing)
                                ? 'opacity-30 cursor-not-allowed text-gray-400' 
                                : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                            }`}
                            title="Activate User"
                          >
                            <Shield size={18} />
                          </button>

                          {/* BUTTON 2: Deactivate */}
                          <button 
                            onClick={() => updateUserStatus(user.id, 'deactivate')}
                            disabled={!isUserActive || isProcessing} 
                            className={`p-2 rounded-lg transition-colors ${
                              (!isUserActive || isProcessing)
                                ? 'opacity-30 cursor-not-allowed text-gray-400' 
                                : 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30'
                            }`}
                            title="Deactivate User"
                          >
                            <ShieldOff size={18} />
                          </button>

                          {/* BUTTON 3: Delete */}
                          <button 
                            onClick={() => handleDeleteClick(user.id)}
                            disabled={isProcessing}
                            className={`p-2 rounded-lg transition-colors ml-1 ${
                               isProcessing ? 'opacity-30 cursor-not-allowed text-gray-400' : 'text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30'
                            }`}
                            title="Delete User"
                          >
                            <Trash2 size={18} />
                          </button>
                          
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in-up">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden p-6 text-center border border-gray-100 dark:border-gray-700">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} />
            </div>
            <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-2">Confirm Deletion</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm leading-relaxed">
              Are you sure you want to soft-delete this user? They will immediately lose access to the workspace.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors">
                Cancel
              </button>
              <button onClick={confirmDelete} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors">
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New User Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Create New User</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
                  <input type="text" required value={newUser.firstName} onChange={(e) => setNewUser({...newUser, firstName: e.target.value})} className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
                  <input type="text" required value={newUser.lastName} onChange={(e) => setNewUser({...newUser, lastName: e.target.value})} className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                <input type="email" required value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Temporary Password</label>
                <input type="password" required minLength={8} value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                  <select value={newUser.role} onChange={(e) => setNewUser({...newUser, role: e.target.value})} className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="EMPLOYEE">Employee</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
                  <select required value={newUser.department} onChange={(e) => setNewUser({...newUser, department: e.target.value})} className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="" disabled>Select Department</option>
                    <option value="WEB_DEVELOPMENT">Web Development</option>
                    <option value="CYBERSECURITY">Cybersecurity</option>
                    <option value="CLOUD_COMPUTING">Cloud Computing</option>
                    <option value="POS_SYSTEMS">POS Systems</option>
                    <option value="NETWORKING">Networking</option>
                    <option value="DATA_ANALYTICS">Data Analytics</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700 mt-6">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitLoading} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg font-medium transition-colors">
                  {submitLoading ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;