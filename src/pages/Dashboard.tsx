import { useMemo, useState, type ReactNode } from 'react'
import { addDays, format, isBefore, parseISO, startOfDay } from 'date-fns'
import { ArrowRight, BriefcaseBusiness, CalendarClock, Check, Clock3, Plus } from 'lucide-react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { getCompanyName } from '../data/demo'
import { useCareerData } from '../context/useCareerData'
import { MonthlyCalendar } from '../components/MonthlyCalendar'
import { RecordDialog } from '../components/RecordDialog'
import { getUpcomingFollowUps } from '../lib/followUps'
import type { AppShellContext, RecordType } from '../types'

const dateLabel = (value: string) => value ? format(parseISO(value), 'MMM d') : '—'
const activeStatuses = ['Saved', 'Applied', 'Assessment', 'Interview']

export function Dashboard() {
  const { data, toggleTask, deleteRecord } = useCareerData()
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

  const openCalendarItem = (type: RecordType, id: string) => setEditRecord({ type, id })
  const deleteEvent = (id: string) => {
    if (window.confirm('Delete this event? This action cannot be undone.')) deleteRecord('event', id)
  }

  return <div className="dashboard-page">
    <section className="welcome-row dashboard-welcome">
      <div><p className="eyebrow">{format(now, 'EEEE, MMMM d')}</p><h1>{greeting}, Alex <span className="greeting-mark">✳</span></h1><p className="welcome-subtitle">Your next steps and schedule, in one place.</p></div>
      <button className="button button-primary" onClick={() => openAdd('application')}><Plus size={16} /> Add application</button>
    </section>

    <section className="metrics-grid" aria-label="Career overview">
      <MetricCard label="Total applications" value={data.applications.length} icon={<BriefcaseBusiness size={16} />} tone="violet" />
      <MetricCard label="Active applications" value={active} icon={<ArrowRight size={16} />} tone="blue" />
      <MetricCard label="Upcoming interviews" value={upcomingInterviews} icon={<CalendarClock size={16} />} tone="green" />
      <MetricCard label="Follow-ups due" value={followUpsDue} icon={<Clock3 size={16} />} tone="amber" />
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
              <div className="task-meta"><span className={action.priority ? `priority priority-${action.priority.toLowerCase()}` : 'followup-label'}>{action.priority ?? 'Follow-up'}</span><time>{overdue ? 'Overdue' : dateLabel(action.dueAt)}</time></div>
            </div>
          })}
        </div> : <EmptyState text="No open follow-ups. Add a task to plan your next move." />}
        <button className="panel-footer-action" onClick={() => navigate('/tasks')}>View all tasks <ArrowRight size={14} /></button>
      </article>
    </section>

    <article className="panel applications-panel dashboard-recent-panel">
      <PanelHeading title="Recent applications" subtitle="Your latest opportunities" trailing={<button className="text-action" onClick={() => navigate('/applications')}>View all <ArrowRight size={14} /></button>} />
      {recentApplications.length ? <div className="application-table-wrap"><table className="application-table">
        <thead><tr><th>Company / role</th><th>Date applied</th><th>Status</th><th>Next step</th><th /></tr></thead>
        <tbody>{recentApplications.map((application) => (
          <tr key={application.id} onClick={() => setEditRecord({ type: 'application', id: application.id })}>
            <td><div className="company-cell"><span className={`company-avatar avatar-${application.companyId.slice(-1)}`}>{getCompanyName(data, application.companyId).slice(0, 1)}</span><span><strong>{getCompanyName(data, application.companyId)}</strong><small>{application.jobTitle}</small></span></div></td>
            <td className="date-cell">{dateLabel(application.appliedAt)}</td>
            <td><span className={`status-badge status-${application.status.toLowerCase()}`}><i />{application.status}</span></td>
            <td className="next-action-cell">{application.nextAction || '—'}</td>
            <td><button className="row-arrow" aria-label={`Edit ${application.jobTitle}`} onClick={(event) => { event.stopPropagation(); setEditRecord({ type: 'application', id: application.id }) }}><ArrowRight size={15} /></button></td>
          </tr>
        ))}</tbody>
      </table></div> : <EmptyState text="Add an application to keep track of your latest opportunities." />}
    </article>
    {editRecord && <RecordDialog type={editRecord.type} recordId={editRecord.id} onClose={() => setEditRecord(null)} />}
  </div>
}

function MetricCard({ label, value, icon, tone }: { label: string; value: number; icon: ReactNode; tone: string }) {
  return <article className="metric-card"><div className="metric-top"><span>{label}</span><i className={`metric-icon ${tone}`}>{icon}</i></div><div className="metric-value">{value}</div></article>
}

function PanelHeading({ title, subtitle, trailing }: { title: string; subtitle: string; trailing?: ReactNode }) {
  return <div className="panel-heading"><div><h2>{title}</h2><p>{subtitle}</p></div>{trailing}</div>
}

function EmptyState({ text }: { text: string }) {
  return <div className="empty-state"><span><Clock3 size={16} /></span><p>{text}</p></div>
}
