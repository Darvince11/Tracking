import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, BriefcaseBusiness, CheckCircle2, Clock3, FileText, Send, Sparkles, TimerReset } from 'lucide-react';
import useAxios from '../../hooks/useAxios';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import SLATimer from '../../components/SLATimer';

const EmployeeDashboard = () => {
  const api = useAxios();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [data, setData] = useState({ tickets: [], stats: {}, logs: [], loading: true, error: '' });
  const [form, setForm] = useState({ content: '', ticketId: '', saving: false });

  const load = useCallback(async () => {
    try {
      const [tickets, stats, logs] = await Promise.all([api.get('/api/tickets'), api.get('/api/stats/me'), api.get('/api/activity-logs/me')]);
      setData({ tickets: tickets.data?.data?.tickets || [], stats: stats.data?.data || {}, logs: logs.data?.data?.logs || [], loading: false, error: '' });
    } catch (error) {
      setData((current) => ({ ...current, loading: false, error: error.response?.data?.message || 'Your workspace could not be loaded.' }));
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);
  const focusTickets = useMemo(() => [...data.tickets].filter((ticket) => ticket.status !== 'COMPLETED').sort((a,b) => new Date(a.deadline || '2999') - new Date(b.deadline || '2999')).slice(0,6), [data.tickets]);

  const submitJournal = async (event) => {
    event.preventDefault();
    if (!form.content.trim()) return;
    setForm((current) => ({ ...current, saving: true }));
    try {
      await api.post('/api/activity-logs', { content: form.content.trim(), ticketId: form.ticketId || null });
      setForm({ content: '', ticketId: '', saving: false });
      showNotification('Your work update has been saved.');
      await load();
    } catch (error) {
      setForm((current) => ({ ...current, saving: false }));
      showNotification(error.response?.data?.message || 'The update could not be saved.', 'error');
    }
  };

  if (data.loading) return <div className="dashboard-shell animate-pulse"><div className="h-64 rounded-[2rem] bg-slate-200 dark:bg-slate-800"/><div className="metric-grid">{[1,2,3].map((item)=><div key={item} className="h-36 rounded-3xl bg-slate-200 dark:bg-slate-800"/>)}</div></div>;
  return <div className="dashboard-shell">
    <section className="dashboard-hero"><div className="hero-orb hero-orb-one"/><div className="hero-orb hero-orb-two"/><div className="relative z-10 flex w-full flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div><div className="eyebrow"><Sparkles size={14}/> Personal workspace</div><h1>Make today count, {user?.firstName || 'teammate'}.</h1><p>You have <strong>{data.stats.activeTasks || 0} active tasks</strong> and {data.stats.overdueTasks || 0} overdue. Your next best actions are ready below.</p></div><Link className="hero-button" to="/employee/tickets">Open my tickets <ArrowUpRight size={16}/></Link></div></section>
    {data.error && <div className="dashboard-alert"><AlertTriangle size={18}/> {data.error}</div>}
    <section className="metric-grid"><Metric icon={BriefcaseBusiness} label="Active tasks" value={data.stats.activeTasks || 0} note="Current workload" tone="violet"/><Metric icon={TimerReset} label="Overdue" value={data.stats.overdueTasks || 0} note="Needs attention today" tone="orange"/><Metric icon={CheckCircle2} label="Finished this week" value={data.stats.completedThisWeek || 0} note="Weekly momentum" tone="green"/><Metric icon={Clock3} label="Focus queue" value={focusTickets.length} note="Prioritized by deadline" tone="blue"/></section>
    <section className="dashboard-grid"><article className="dashboard-panel chart-panel"><div className="panel-heading"><div><span className="panel-kicker">Your work</span><h2>Priority task queue</h2></div><Link className="panel-link" to="/employee/tickets">See all <ArrowUpRight size={14}/></Link></div><div className="task-list">{focusTickets.length === 0 ? <div className="empty-focus"><span><CheckCircle2 size={25}/></span><strong>You are all caught up</strong><p>There are no active tickets in your queue.</p></div> : focusTickets.map((ticket)=><div className="task-row" key={ticket.id}><div className="min-w-0"><div className="task-meta"><span className="task-code">{ticket.trackingNumber}</span><span className="status-pill">{ticket.status.replaceAll('_',' ')}</span></div><div className="task-title truncate">{ticket.title}</div></div><div className="task-hours"><div>{ticket.actualHours || 0} / {ticket.estimatedHours || 0} hours</div><SLATimer slaRemainingMs={ticket.slaRemainingMs} deadline={ticket.deadline}/></div></div>)}</div></article>
      <article className="dashboard-panel focus-panel"><div className="panel-heading"><div><span className="panel-kicker">Daily journal</span><h2>Capture your progress</h2></div><FileText size={21}/></div><form className="journal-composer mt-4 space-y-3" onSubmit={submitJournal}><select aria-label="Related ticket" value={form.ticketId} onChange={(event)=>setForm((current)=>({...current,ticketId:event.target.value}))}><option value="">General work update</option>{focusTickets.map((ticket)=><option key={ticket.id} value={ticket.id}>{ticket.trackingNumber} — {ticket.title}</option>)}</select><textarea aria-label="Work update" placeholder="What did you move forward today?" value={form.content} onChange={(event)=>setForm((current)=>({...current,content:event.target.value}))}/><button className="journal-button" disabled={form.saving || !form.content.trim()}><Send size={15}/> {form.saving ? 'Saving…' : 'Post update'}</button></form><div className="mt-4 space-y-2 overflow-y-auto">{data.logs.slice(0,4).map((log)=><div className="journal-entry" key={log.id}><small>{log.ticket?.trackingNumber || 'GENERAL'} · {new Date(log.logDate).toLocaleDateString()}</small><p>{log.content}</p></div>)}</div></article>
    </section>
  </div>;
};

const Metric = ({icon:Icon,label,value,note,tone}) => <article className={`metric-card tone-${tone}`}><div className="metric-icon"><Icon size={21}/></div><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></article>;
export default EmployeeDashboard;
