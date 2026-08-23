import { Home, Users, Ticket, LogOut, Moon, Sun, Menu, X, ClipboardList, Layers, BarChart3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = ({ darkMode, setDarkMode }) => {
  // Pull 'user' from context
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Determine if admin based on the user object
  const isAdmin = user?.role === 'ADMIN';

  // Navigation items updated with Group Tasks and Reports
  const navItems = isAdmin ? [
    { label: 'Admin Dash', icon: Home, path: '/admin' },
    { label: 'User Mgmt', icon: Users, path: '/admin/users' },
    { label: 'Team Tickets', icon: Ticket, path: '/tickets' },
    { label: 'Group Tasks', icon: Layers, path: '/group-tasks' },
    { label: 'Reports', icon: BarChart3, path: '/admin/reports' },
    { label: 'All Tickets (Legacy)', icon: ClipboardList, path: '/admin/tickets' },
  ] : [
    { label: 'My Workspace', icon: Home, path: '/employee' },
    { label: 'Team Tickets', icon: Ticket, path: '/tickets' },
    { label: 'Group Tasks', icon: Layers, path: '/group-tasks' },
  ];

  // Helper to close mobile menu when a link is clicked
  const handleLinkClick = () => setIsOpen(false);

  return (
    <>
      {/* Mobile Toggle */}
      <button onClick={() => setIsOpen(!isOpen)} className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-primary text-white rounded-md">
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-darkCard border-r border-slate-200 dark:border-slate-700 transform transition-transform duration-200 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full p-4">
          <div className="text-2xl font-bold text-primary mb-8 px-2 tracking-tight">NEXORATEL</div>
          
          <nav className="flex-1 space-y-1">
            {navItems.map((item) => (
              <Link 
                key={item.path} 
                to={item.path} 
                onClick={handleLinkClick} // Closes sidebar on mobile after clicking
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  location.pathname === item.path 
                    ? 'bg-primary text-white' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4 space-y-2">
            <button onClick={() => setDarkMode(!darkMode)} className="flex items-center gap-3 w-full px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
            <button onClick={logout} className="flex items-center gap-3 w-full px-3 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
