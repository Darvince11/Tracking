import { useState, useEffect } from 'react';
import useAxios from '../hooks/useAxios';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Layers, Plus, Trash2, Users, X } from 'lucide-react';

const GroupTasks = () => {
  const api = useAxios();
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal & Form State (Admin Only)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    memberIds: []
  });

  // Custom Delete Modal State
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  const fetchData = async () => {
    try {
      const [tasksRes, usersRes] = await Promise.all([
        api.get('/api/group-tasks'),
        isAdmin ? api.get('/api/admin/users') : Promise.resolve({ data: [] })
      ]);

      setTasks(tasksRes.data?.data?.tasks || []);
      
      const rawUsers = usersRes.data;
      let finalUsers = [];
      if (Array.isArray(rawUsers)) finalUsers = rawUsers;
      else if (Array.isArray(rawUsers?.data)) finalUsers = rawUsers.data;
      else if (Array.isArray(rawUsers?.data?.users)) finalUsers = rawUsers.data.users;
      setUsers(finalUsers);

    } catch (error) {
      console.error("Failed to load group tasks", error);
      showNotification("Failed to load group tasks", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      await api.post('/api/admin/group-tasks', newTask);
      showNotification("Group task created successfully", "success");
      setIsModalOpen(false);
      setNewTask({ title: '', description: '', memberIds: [] });
      fetchData();
    } catch (error) {
      console.error("Failed to create group task", error);
      showNotification(error.response?.data?.message || "Failed to create task", "error");
    } finally {
      setSubmitLoading(false);
    }
  };

  const confirmDeleteTask = (task) => {
    setTaskToDelete(task);
  };

  const executeDeleteTask = async () => {
    if (!taskToDelete) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/api/admin/group-tasks/${taskToDelete.id}`);
      showNotification("Group task deleted", "success");
      setTasks(prev => prev.filter(t => t.id !== taskToDelete.id));
      setTaskToDelete(null);
    } catch (error) {
      console.error("Failed to delete group task", error);
      showNotification("Failed to delete task", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleMemberToggle = (userId) => {
    setNewTask(prev => {
      const exists = prev.memberIds.includes(userId);
      return {
        ...prev,
        memberIds: exists ? prev.memberIds.filter(id => id !== userId) : [...prev.memberIds, userId]
      };
    });
  };

  if (loading) {
    return <div className="p-12 text-center text-gray-400 animate-pulse">Loading group milestones...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <Layers className="text-primary" /> Group Tasks & Milestones
          </h1>
          <p className="text-gray-500 mt-1">Collaborative team projects and collective goals.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-sm"
          >
            <Plus size={18} /><span>New Group Task</span>
          </button>
        )}
      </div>

      {/* Task Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tasks.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 text-gray-500">
            No group tasks active right now.
          </div>
        ) : (
          tasks.map(task => (
            <div key={task.id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between relative">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{task.title}</h3>
                  {isAdmin && (
                    <button onClick={() => confirmDeleteTask(task)} className="text-gray-400 hover:text-red-600 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">{task.description}</p>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-700 pt-4 mt-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-2">
                  <Users size={14} /> Assigned Members ({task.members?.length || 0})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {task.members?.map(m => (
                    <span key={m.id} className="px-2.5 py-1 text-xs rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium">
                      {m.firstName} {m.lastName}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Group Task Modal (Admin Only) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Create Group Milestone</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Task Title</label>
                <input 
                  type="text" 
                  required 
                  value={newTask.title} 
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})} 
                  className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white outline-none" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea 
                  required 
                  rows="3" 
                  value={newTask.description} 
                  onChange={(e) => setNewTask({...newTask, description: e.target.value})} 
                  className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white outline-none resize-none" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assign Team Members</label>
                <div className="max-h-40 overflow-y-auto space-y-2 border border-gray-200 dark:border-gray-700 p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                  {users.map(u => (
                    <label key={u.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={newTask.memberIds.includes(u.id)}
                        onChange={() => handleMemberToggle(u.id)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      {u.firstName} {u.lastName} <span className="text-xs text-gray-400">({u.department})</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t dark:border-gray-700 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300 rounded-lg font-medium">Cancel</button>
                <button type="submit" disabled={submitLoading} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50">
                  {submitLoading ? 'Creating...' : 'Create Milestone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {taskToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#1a1d27] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 space-y-6">
            
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 border border-red-200 dark:border-red-900/50">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete Group Task</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Are you sure you want to delete <span className="font-semibold text-gray-700 dark:text-gray-300">"{taskToDelete.title}"</span>? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800/60">
              <button
                type="button"
                onClick={() => setTaskToDelete(null)}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDeleteTask}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {deleteLoading ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default GroupTasks;
