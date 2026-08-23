import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, AlertTriangle, ArrowUpRight, CheckCircle2, CircleDot, RefreshCw, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import useAxios from '../../hooks/useAxios';
import { useAuth } from '../../context/AuthContext';

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const AdminDashboard = () => {
  const api = useAxios();
  const { user } = useAuth();
  const [state, setState] = useState({ users: [], tickets: [], loading: true, refreshing: false, error: '' });

  const load = useCallback(async (quiet = false) => {
    setState((current) => ({ ...current, [quiet ? 'refreshing' : 'loading']: true, error: '' }));
    try {
      const [usersResponse, ticketsResponse] = await Promise.all([
        api.get('/api/admin/users'), api.get('/api/admin/tickets/directory?limit=100')
      ]);
      setState({
        users: usersResponse.data?.data?.users || usersResponse.data?.data || [],
        tickets: ticketsResponse.data?.data?.tickets || [], loading: false, refreshing: false, error: ''
      });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, refreshing: false, error: error.response?.data?.message || 'Dashboard data is temporarily unavailable.' }));
    }
  }, [api]);

  useEffect(() => {
    load();
    const timer = window.setInterval(() => load(true), 60000);
    return () => window.clearInterval(timer);
  }, [load]);

  const insights = useMemo(() => {
    const active = state.tickets.filter((ticket) => ['OPEN', 'IN_PROGRESS', 'UNDER_REVIEW'].includes(ticket.status));
    const completed = state.tickets.filter((ticket) => ticket.status === 'COMPLETED');
    const blocked = state.tickets.filter((ticket) => ticket.status === 'BLOCKED' || ticket.isBlocked);
    const overdue = state.tickets.filter((ticket) => ticket.isOverdue || (ticket.deadline && new Date(ticket.deadline) < new Date() && ticket.status !== 'COMPLETED'));
    const velocity = Object.fromEntries(days.map((day) => [day, { day, opened: 0, resolved: 0 }]));
    state.tickets.forEach((ticket) => {
      const openedDay = new Date(ticket.createdAt).toLocaleDateString('en-US', { weekday: 'short' });
      if (velocity[openedDay]) velocity[openedDay].opened += 1;
      if (ticket.status === 'COMPLETED') {
        const resolvedDay = new Date(ticket.updatedAt).toLocaleDateString('en-US', { weekday: 'short' });
        if (velocity[resolvedDay]) velocity[resolvedDay].resolved += 1;
      }
    });
    return { active, completed, blocked, overdue, completionRate: state.tickets.length ? Math.round((completed.length / state.tickets.length) * 100) : 0, velocity: days.map((day) => velocity[day]) };
  }, [state.tickets]);

  if (state.loading) return <DashboardSkeleton />;
  return <div className="dashboard-shell">
    <section className="dashboard-hero"><div className="hero-orb hero-orb-one"/><div className="hero-orb hero-orb-two"/><div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div><div className="eyebrow"><Sparkles size={14}/> Operations command center</div><h1>Good day, {user?.firstName || 'Admin'}.</h1><p>Your organization is operating at <strong>{insights.completionRate}% completion</strong>. Team momentum and focus areas are summarized below.</p></div><div className="flex flex-wrap gap-3"><button className="glass-button" onClick={() => load(true)} disabled={state.refreshing}><RefreshCw size={16} className={state.refreshing ? 'animate-spin' : ''}/> Refresh</button><Link className="hero-button" to="/admin/reports">View reports <ArrowUpRight size={16}/></Link></div></div></section>
    {state.error && <div className="dashboard-alert"><AlertTriangle size={18}/> {state.error}</div>}
    <section className="metric-grid"><Metric icon={Users} label="Active people" value={state.users.filter((person) => person.accountStatus !== 'INACTIVE').length} note={`${state.users.length} total teammates`} tone="violet"/><Metric icon={Activity} label="Active workflow" value={insights.active.length} note="Open and in progress" tone="blue"/><Metric icon={CheckCircle2} label="Completed" value={insights.completed.length} note={`${insights.completionRate}% resolution rate`} tone="green"/><Metric icon={AlertTriangle} label="Needs attention" value={insights.blocked.length + insights.overdue.length} note={`${insights.overdue.length} currently overdue`} tone="orange"/></section>
    <section className="dashboard-grid"><article className="dashboard-panel chart-panel"><div className="panel-heading"><div><span className="panel-kicker">Weekly flow</span><h2>Delivery momentum</h2></div><div className="chart-legend"><span><i className="opened"/> Opened</span><span><i className="resolved"/> Resolved</span></div></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={insights.velocity} margin={{top:12,right:8,left:-24,bottom:0}}><defs><linearGradient id="adminOpened" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7c3aed" stopOpacity=".35"/><stop offset="1" stopColor="#7c3aed" stopOpacity="0"/></linearGradient><linearGradient id="adminDone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#14b8a6" stopOpacity=".3"/><stop offset="1" stopColor="#14b8a6" stopOpacity="0"/></linearGradient></defs><CartesianGrid vertical={false} stroke="rgba(148,163,184,.16)"/><XAxis dataKey="day" axisLine={false} tickLine={false}/><YAxis allowDecimals={false} axisLine={false} tickLine={false}/><Tooltip contentStyle={{border:0,borderRadius:16}}/><Area type="monotone" dataKey="opened" stroke="#7c3aed" strokeWidth={3} fill="url(#adminOpened)"/><Area type="monotone" dataKey="resolved" stroke="#14b8a6" strokeWidth={3} fill="url(#adminDone)"/></AreaChart></ResponsiveContainer></div></article>
      <article className="dashboard-panel focus-panel"><div className="panel-heading"><div><span className="panel-kicker">Priority queue</span><h2>Requires attention</h2></div><ShieldCheck size={21}/></div><div className="focus-list">{insights.blocked.length === 0 ? <EmptyFocus/> : insights.blocked.slice(0,5).map((ticket)=><Link to="/admin/tickets" className="focus-row" key={ticket.id}><span className="focus-icon"><CircleDot size={16}/></span><span className="min-w-0 flex-1"><strong>{ticket.title}</strong><small>{ticket.trackingNumber} · {ticket.assignee ? `${ticket.assignee.firstName} ${ticket.assignee.lastName}` : 'Unassigned'}</small></span><ArrowUpRight size={16}/></Link>)}</div><Link className="panel-link" to="/admin/tickets">Open ticket directory <ArrowUpRight size={15}/></Link></article>
    </section>
  </div>;
};

const Metric = ({icon:Icon,label,value,note,tone}) => <article className={`metric-card tone-${tone}`}><div className="metric-icon"><Icon size={21}/></div><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></article>;
const EmptyFocus = () => <div className="empty-focus"><span><CheckCircle2 size={25}/></span><strong>Everything looks clear</strong><p>No blocked tickets need escalation right now.</p></div>;
const DashboardSkeleton = () => <div className="dashboard-shell animate-pulse"><div className="h-64 rounded-[2rem] bg-slate-200 dark:bg-slate-800"/><div className="metric-grid">{[1,2,3,4].map((item)=><div key={item} className="h-36 rounded-3xl bg-slate-200 dark:bg-slate-800"/>)}</div></div>;
export default AdminDashboard;
