import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext'; 

// Layout & Auth
const Login = lazy(() => import('./pages/auth/Login'));
import DashboardLayout from './layouts/DashboardLayout';

// Employee Pages
const EmployeeDashboard = lazy(() => import('./pages/employee/Dashboard'));
const MyTickets = lazy(() => import('./pages/employee/MyTickets'));
const EmployeeJournalPage = lazy(() => import('./pages/employee/Journal'));

// Admin Pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement'));
const TicketDirectory = lazy(() => import('./pages/admin/TicketDirectory'));
const EmployeeTracking = lazy(() => import('./pages/admin/EmployeeTracking'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const SlaMonitoring = lazy(() => import('./pages/SlaMonitoring'));
const AdminJournal = lazy(() => import('./pages/admin/AdminJournal'));
// Update your import to point to the admin folder
const AdminReports = lazy(() => import('./pages/admin/AdminReports'));

// Shared Pages
const Profile = lazy(() => import('./pages/Profile'));
const TicketDashboard = lazy(() => import('./shared/TicketDashboard'));
const GroupTasks = lazy(() => import('./shared/GroupTasks'));

const App = () => {
  return (
    <ThemeProvider>
      {/* WRAPPED ENTIRE APP IN NOTIFICATION PROVIDER */}
      <NotificationProvider>
        <AuthProvider>
          <Suspense fallback={<div className="grid min-h-screen place-items-center bg-slate-50 text-sm font-semibold text-slate-500 dark:bg-slate-950">Loading workspace…</div>}>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Employee Routes */}
            <Route element={<DashboardLayout allowedRoles={['EMPLOYEE']} />}>
              <Route path="/employee" element={<EmployeeDashboard />} />
              <Route path="/employee/tickets" element={<MyTickets />} />
              <Route path="/employee/journal" element={<EmployeeJournalPage />} />
            </Route>

            {/* Admin Routes */}
            <Route element={<DashboardLayout allowedRoles={['ADMIN']} />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<UserManagement />} />
              <Route path="/admin/tickets" element={<TicketDirectory />} />
              <Route path="/admin/tracking" element={<EmployeeTracking />} />
              <Route path="/admin/audit-logs" element={<AuditLogs />} />
              <Route path="/admin/sla" element={<SlaMonitoring />} />
              <Route path="/admin/reports" element={<AdminReports />} />
              <Route path="/admin/journal" element={<AdminJournal />} />
            </Route>

            {/* Shared Routes (Both Admin and Employee) */}
            <Route element={<DashboardLayout allowedRoles={['EMPLOYEE', 'ADMIN']} />}>
              <Route path="/profile" element={<Profile />} />
              
              {/* FIXED: Moved TicketDashboard inside the Routes and under the Shared Layout */}
              <Route path="/tickets" element={<TicketDashboard />} />
              <Route path="/group-tasks" element={<GroupTasks />} />
            </Route>

            {/* Fallback Catch-all (Must be last) */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
          </Suspense>
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
};

export default App;
