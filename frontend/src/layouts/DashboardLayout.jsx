import { useState } from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Sun, Moon, LogOut, LayoutDashboard, Ticket, Users, 
  Activity, ClipboardList, History, Clock, Menu, X, Layers, BarChart3, FileText 
} from 'lucide-react';
import logo from '../assets/logo.png';

const DashboardLayout = ({ allowedRoles }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  
  // State for mobile drawer
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const normalizedRole = (user?.role || '').toUpperCase();
  const hasAccess = (allowedRoles || []).some((role) => role.toUpperCase() === normalizedRole);

  if (!user || !hasAccess) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const isAdmin = normalizedRole === 'ADMIN';

  const navLinks = isAdmin
    ? [
        { path: '/admin', label: 'Admin Dashboard', icon: LayoutDashboard },
        { path: '/admin/users', label: 'User Management', icon: Users },
        { path: '/admin/tracking', label: 'Employee Tracking', icon: Activity },
        { path: '/admin/tickets', label: 'Ticket Directory', icon: ClipboardList },
        { path: '/admin/audit-logs', label: 'Audit Logs', icon: History },
        { path: '/admin/sla', label: 'SLA Monitoring', icon: Clock },
        { path: '/admin/reports', label: 'Reports', icon: BarChart3 },
        { path: '/admin/journal', label: 'Employee Journal', icon: FileText },
        { path: '/group-tasks', label: 'Group Tasks', icon: Layers },
        { path: '/tickets', label: 'Team Tickets', icon: Ticket },
      ]
    : [
        { path: '/employee', label: 'My Workspace', icon: LayoutDashboard },
        { path: '/employee/tickets', label: 'My Tickets', icon: Ticket },
        { path: '/employee/journal', label: 'Daily Journal', icon: FileText },
        { path: '/tickets', label: 'Team Tickets', icon: ClipboardList },
        { path: '/group-tasks', label: 'Group Tasks', icon: Layers },
      ];

  // Helper to close menu on mobile after clicking a link
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="layout-wrapper flex h-screen overflow-hidden w-full relative">
      
      {/* MOBILE BACKDROP OVERLAY */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={closeMobileMenu}
        />
      )}

      {/* SIDEBAR (Slide-out menu on mobile, fixed on desktop) */}
      <aside 
        className={`sidebar fixed md:relative inset-y-0 left-0 z-50 h-full transform transition-transform duration-300 ease-in-out md:translate-x-0 bg-white dark:bg-[#1a1d27] md:bg-transparent ${
          isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
        style={{ width: '260px', display: 'flex', flexDirection: 'column' }}
      >
        <div className="sidebar-header relative" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', minHeight: '120px' }}>
          
          {/* Mobile Close Button (Inside Sidebar Drawer) */}
          <button 
            className="md:hidden absolute top-4 right-4 p-1 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white focus:outline-none"
            onClick={closeMobileMenu}
          >
            <X size={24} />
          </button>

          {/* Large Logo inside the Drawer/Sidebar */}
          <img 
            src={logo} 
            alt="Nexoratel Logo" 
            style={{ 
              width: '230px', 
              height: '230px', 
              maxHeight: '250px', 
              objectFit: 'contain', 
              mixBlendMode: theme === 'dark' ? 'screen' : 'multiply', 
              pointerEvents: 'none' 
            }} 
          />
        </div>
        
        <nav className="nav-menu flex-1 overflow-y-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={closeMobileMenu}
                className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
              >
                <Icon size={20} />
                <span>{link.label}</span>
              </Link>
            )
          })}
        </nav>

        <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)' }}>
          <button 
            onClick={() => {
              logout();
              closeMobileMenu();
            }} 
            className="nav-link" 
            style={{ color: 'var(--danger-text)', width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="main-content flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="top-nav flex items-center justify-between px-4 py-3 md:px-6 border-b border-gray-200 dark:border-gray-800">
          
          {/* LEFT HEADER AREA: Mobile Logo */}
          <div className="flex items-center flex-1">
            {/* Added -ml-4 here to pull the logo tightly to the left border */}
            <div className="md:hidden flex items-center -ml-9">
              {/* Small Logo for Mobile Header */}
              <img 
                src={logo} 
                alt="Nexoratel Logo" 
                style={{ 
                  height: '200px', 
                  width: '200px',
                  objectFit: 'contain', 
                  mixBlendMode: theme === 'dark' ? 'screen' : 'multiply' 
                }} 
              />
            </div>
          </div>
          
          {/* RIGHT HEADER AREA: Theme Toggle, Profile Avatar, and Hamburger Menu */}
          <div className="nav-actions flex items-center gap-3 sm:gap-4 ml-auto">
            <button onClick={toggleTheme} className="icon-btn">
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            
            <Link 
              to="/profile" 
              style={{ 
                width: '35px', 
                height: '35px', 
                borderRadius: '50%', 
                background: 'linear-gradient(to right, var(--primary-gradient-start), var(--primary-gradient-end))', 
                color: 'white', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontWeight: 'bold',
                textDecoration: 'none',
                flexShrink: 0
              }}
            >
              {user?.email?.[0]?.toUpperCase() || (user?.role === 'ADMIN' ? 'A' : 'U')}
            </Link>

            {/* Hamburger Button (Moved to the far right, just after the profile avatar) */}
            <button 
              className="md:hidden p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg focus:outline-none transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open Menu"
            >
              <Menu size={24} />
            </button>
          </div>
        </header>

        {/* SCROLLABLE PAGE CONTAINER */}
        <div className="page-container flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;