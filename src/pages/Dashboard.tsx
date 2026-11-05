import { useMemo, useState, type ReactNode } from 'react'
import { addDays, format, isBefore, parseISO, startOfDay } from 'date-fns'
import { ArrowRight, BriefcaseBusiness, CalendarClock, Check, Clock3, Plus } from 'lucide-react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { getCompanyName } from '../data/demo'
import { useCareerData } from '../context/useCareerData'
import { useAuth } from '../context/auth-context'
import { MonthlyCalendar } from '../components/MonthlyCalendar'
import { RecordDialog } from '../components/RecordDialog'
import { getUpcomingFollowUps } from '../lib/followUps'
import type { AppShellContext, RecordType } from '../types'

const dateLabel = (value: string) => value ? format(parseISO(value), 'MMM d') : '—'
const activeStatuses = ['Saved', 'Applied', 'Assessment', 'Interview']

export function Dashboard() {
  const { data, toggleTask, deleteRecord } = useCareerData()
  const auth = useAuth()
  const { openAdd } = useOutletContext<AppShellContext>()
  const navigate = useNavigate()
  const [now] = useState(() => new Date())
  const [editRecord, setEditRecord] = useState<{ type: RecordType; id: string } | null>(null)
  const today = startOfDay(now)
  const active = data.applications.filter((application) => activeStatuses.includes(application.status)).length
  const upcomingInterviews = data.events.filter((event) => event.eventType === 'Interview' && parseISO(event.startsAt) >= now).length
  const followUps = useMemo(() => getUpcomingFollowUps(data), [data])
  const upcomingActions = followUps.slice(0, 5)
  const followUpsDue = followUps.filter((action) => isBefore(parseISO(action.dueAt), addDays(today, 1))).length
  const recentApplications = useMemo(() => data.applications
    .slice()
    .sort((first, second) => second.appliedAt.localeCompare(first.appliedAt))
    .slice(0, 5), [data.applications])
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening'
  const metadataName = auth.session?.user.user_metadata?.full_name
  const greetingName = typeof metadataName === 'string' && metadataName.trim()
    ? metadataName.trim()
    : auth.user?.name.trim() || auth.user?.email.split('@')[0] || 'there'

  const openCalendarItem = (type: RecordType, id: string) => setEditRecord({ type, id })
  const deleteEvent = (id: string) => {
    if (window.confirm('Delete this event? This action cannot be undone.')) deleteRecord('event', id)
  }

  return <div className="dashboard-page">
    <section className="welcome-row dashboard-welcome">
      <div><p className="eyebrow">{format(now, 'EEEE, MMMM d')}</p><h1>{greeting}, {greetingName}</h1><p className="welcome-subtitle">A clear view of your opportunities and what to do next.</p></div>
      <button className="button button-primary" onClick={() => openAdd('application')}><Plus size={16} /> Add application</button>
    </section>

    <section className="metrics-grid" aria-label="Career overview">
      <MetricCard label="Total applications" value={data.applications.length} icon={<BriefcaseBusiness size={17} />} tone="violet" onClick={() => navigate('/applications')} />
      <MetricCard label="Active applications" value={active} icon={<ArrowRight size={17} />} tone="blue" onClick={() => navigate('/applications')} />
      <MetricCard label="Upcoming interviews" value={upcomingInterviews} icon={<CalendarClock size={17} />} tone="green" onClick={() => navigate('/calendar')} />
      <MetricCard label="Follow-ups due" value={followUpsDue} icon={<Clock3 size={17} />} tone="amber" onClick={() => navigate('/tasks')} />
    </section>

    <section className="dashboard-focus-grid">
      <article className="panel dashboard-calendar-panel">
        <MonthlyCalendar
          data={data}
          compact
          onAdd={openAdd}
          onOpen={openCalendarItem}
          onDeleteEvent={deleteEvent}
        />
      </article>
      <article className="panel dashboard-actions-panel">
        <PanelHeading title="Your next steps" subtitle="Open tasks and follow-ups" trailing={<button className="text-action" onClick={() => openAdd('task')}>Add task <Plus size={13} /></button>} />
        {upcomingActions.length ? <div className="task-list">
          {upcomingActions.map((action) => {
            const overdue = isBefore(parseISO(action.dueAt), today)
            return <div className={`task-row ${overdue ? 'task-overdue' : ''}`} key={`${action.recordType}-${action.id}`}>
              {action.recordType === 'task' ? <button className="task-check" aria-label="Mark task complete" onClick={() => toggleTask(action.id)}><Check size={12} /></button> : <span className="followup-action-symbol" aria-hidden="true"><Clock3 size={13} /></span>}
              <button className="task-copy task-open-button" onClick={() => openCalendarItem(action.recordType, action.id)}><strong>{action.title}</strong><span>{getCompanyName(data, action.companyId)}</span></button>
              <div className="task-meta"><span className={action.priority ? `priority priority-${action.priority.toLowerCase()}` : 'followup-label'}>{action.priority ?? 'Follow-up'}</span>{action.recordType === 'task' && <span className="task-status-open">Open</span>}<time>{overdue ? 'Overdue' : dateLabel(action.dueAt)}</time></div>
            </div>
          })}
        </div> : <EmptyState text="No open follow-ups. Add a task to plan your next move." action="Add task" onAction={() => openAdd('task')} />}
        <button className="panel-footer-action" onClick={() => navigate('/tasks')}>View all tasks <ArrowRight size={14} /></button>
      </article>
    </section>

    <article className="panel applications-panel dashboard-recent-panel">
      <PanelHeading title="Recent applications" subtitle="Your latest opportunities" trailing={<button className="text-action" onClick={() => navigate('/applications')}>View all <ArrowRight size={14} /></button>} />
      {recentApplications.length ? <div className="application-table-wrap"><table className="application-table">
        <thead><tr><th>Company / role</th><th>Date applied</th><th>Status</th><th>Next step</th><th /></tr></thead>
        <tbody>{recentApplications.map((application) => (
          <tr key={application.id}>
            <td><button className="company-cell application-row-open" aria-label={`Open ${application.jobTitle} at ${getCompanyName(data, application.companyId)}`} onClick={() => setEditRecord({ type: 'application', id: application.id })}><span className="company-avatar">{getCompanyName(data, application.companyId).slice(0, 1)}</span><span><strong>{getCompanyName(data, application.companyId)}</strong><small>{application.jobTitle}</small></span></button></td>
            <td className="date-cell">{dateLabel(application.appliedAt)}</td>
            <td><span className={`status-badge status-${application.status.toLowerCase()}`}><i />{application.status}</span></td>
            <td className="next-action-cell">{application.nextAction || '—'}</td>
            <td><button className="row-arrow" aria-label={`Edit ${application.jobTitle}`} onClick={() => setEditRecord({ type: 'application', id: application.id })}><ArrowRight size={15} /></button></td>
          </tr>
        ))}</tbody>
      </table></div> : <EmptyState text="Your applications will appear here. Add an opportunity to start tracking its progress." action="Add application" onAction={() => openAdd('application')} />}
    </article>
    {editRecord && <RecordDialog type={editRecord.type} recordId={editRecord.id} onClose={() => setEditRecord(null)} />}
  </div>
}

function MetricCard({ label, value, icon, tone, onClick }: { label: string; value: number; icon: ReactNode; tone: string; onClick: () => void }) {
  return <button className="metric-card" onClick={onClick}><span className="metric-top"><span>{label}</span><i className={`metric-icon ${tone}`}>{icon}</i></span><span className="metric-value">{value}</span><span className="metric-card-hint">View details <ArrowRight size={13} /></span></button>
}

function PanelHeading({ title, subtitle, trailing }: { title: string; subtitle: string; trailing?: ReactNode }) {
  return <div className="panel-heading"><div><h2>{title}</h2><p>{subtitle}</p></div>{trailing}</div>
}

function EmptyState({ text, action, onAction }: { text: string; action?: string; onAction?: () => void }) {
  return <div className="empty-state"><span><Clock3 size={16} /></span><p>{text}</p>{action && onAction && <button className="text-action" onClick={onAction}>{action} <Plus size={13} /></button>}</div>
}
