import { useMemo, useState } from 'react'
import { format, isAfter, isBefore, isSameDay, parseISO, startOfDay, startOfToday } from 'date-fns'
import { ArrowDownUp, ArrowRight, CalendarDays, Check, Circle, Download, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useLocation, useOutletContext, useSearchParams } from 'react-router-dom'
import { getCompanyName } from '../data/demo'
import { useCareerData } from '../context/useCareerData'
import { useAuth } from '../context/auth-context'
import type { AppShellContext, RecordType } from '../types'
import { RecordDialog } from '../components/RecordDialog'
import { MonthlyCalendar } from '../components/MonthlyCalendar'
import { taskDueDateLabel } from '../lib/taskDueDate'
import { useTheme } from '../context/useTheme'

interface DirectoryRow {
  id: string
  type: RecordType
  name: string
  subtitle: string
  company: string
  status: string
  date: string
  location: string
  tags?: string[]
}

const routeConfig: Record<string, { type: RecordType; title: string; description: string; addLabel: string }> = {
  '/companies': { type: 'company', title: 'Companies', description: 'Keep the organizations on your radar in one place.', addLabel: 'Add company' },
  '/contacts': { type: 'contact', title: 'Contacts', description: 'Build meaningful professional connections over time.', addLabel: 'Add contact' },
  '/applications': { type: 'application', title: 'Applications', description: 'A clear view of every opportunity in your search.', addLabel: 'Add application' },
}

export function DirectoryPage() {
  const { pathname } = useLocation()
  const config = routeConfig[pathname] ?? routeConfig['/applications']
  const { data, deleteRecord } = useCareerData()
  const { openAdd } = useOutletContext<AppShellContext>()
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const [sortAscending, setSortAscending] = useState(config.type !== 'application')
  const [sortField, setSortField] = useState(config.type === 'application' ? 'date' : 'name')
  const [statusFilter, setStatusFilter] = useState('All')
  const [companyFilter, setCompanyFilter] = useState('All companies')
  const [industryFilter, setIndustryFilter] = useState('All industries')
  const [tagFilter, setTagFilter] = useState('All tags')
  const [editing, setEditing] = useState<string | null>(null)
  const rows: DirectoryRow[] = useMemo(() => {
    if (config.type === 'company') return data.companies.map((company) => ({
      id: company.id, type: 'company', name: company.name, subtitle: company.industry || 'Industry not set', company: company.size || 'Size not set',
      status: '', date: company.createdAt, location: company.location, tags: company.tags,
    }))
    if (config.type === 'contact') return data.contacts.map((contact) => ({
      id: contact.id, type: 'contact', name: contact.name, subtitle: contact.jobTitle || 'Role not set', company: getCompanyName(data, contact.companyId),
      status: contact.status, date: contact.lastContactedAt, location: '', tags: contact.tags,
    }))
    return data.applications.map((application) => ({
      id: application.id, type: 'application', name: application.jobTitle, subtitle: application.nextAction || 'No next action yet', company: getCompanyName(data, application.companyId),
      status: application.status, date: application.appliedAt, location: application.location,
    }))
  }, [config.type, data])
  const filteredRows = rows.filter((row) => `${row.name} ${row.subtitle} ${row.company} ${row.location} ${(row.tags ?? []).join(' ')}`.toLowerCase().includes(query.trim().toLowerCase()))
    .filter((row) => statusFilter === 'All' || row.status === statusFilter)
    .filter((row) => config.type === 'company' ? industryFilter === 'All industries' || row.subtitle === industryFilter : companyFilter === 'All companies' || row.company === companyFilter)
    .filter((row) => tagFilter === 'All tags' || row.tags?.includes(tagFilter))
    .sort((first, second) => {
      const firstValue = sortField === 'date' ? first.date : first.name
      const secondValue = sortField === 'date' ? second.date : second.name
      return sortAscending ? firstValue.localeCompare(secondValue) : secondValue.localeCompare(firstValue)
    })
  const statusOptions = config.type === 'application' ? ['Saved', 'Applied', 'Assessment', 'Interview', 'Offer', 'Rejected'] : config.type === 'contact' ? ['Connected', 'Requested', 'Not connected'] : []
  const industryOptions = [...new Set(data.companies.map((company) => company.industry).filter(Boolean))]
  const tagOptions = [...new Set(rows.flatMap((row) => row.tags ?? []))]

  const remove = (row: DirectoryRow) => {
    const confirmed = window.confirm(`Delete ${row.name}? This action cannot be undone.`)
    if (confirmed) deleteRecord(row.type, row.id)
  }

  return (
    <section className="directory-page">
      <div className="page-title-row"><div><p className="eyebrow">YOUR CAREER WORKSPACE</p><h1>{config.title}</h1><p className="page-description">{config.description}</p></div><button className="button button-primary" onClick={() => openAdd(config.type)}><Plus size={16} /> {config.addLabel}</button></div>
      <div className="panel directory-panel">
        <div className="directory-toolbar">
          <label className="table-search directory-search"><Search size={15} /><input placeholder={`Search ${config.title.toLowerCase()}...`} aria-label={`Search ${config.title}`} value={query} onChange={(event) => setSearchParams(event.target.value ? { q: event.target.value } : {})} /></label>
          <div className="directory-filters">
            {config.type === 'company' ? <select aria-label="Filter by industry" value={industryFilter} onChange={(event) => setIndustryFilter(event.target.value)}><option>All industries</option>{industryOptions.map((industry) => <option key={industry}>{industry}</option>)}</select> : <select aria-label="Filter by company" value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)}><option>All companies</option>{data.companies.map((company) => <option key={company.id}>{company.name}</option>)}</select>}
            {(config.type === 'company' || config.type === 'contact') && <select aria-label="Filter by tag" value={tagFilter} onChange={(event) => setTagFilter(event.target.value)}><option>All tags</option>{tagOptions.map((tag) => <option key={tag}>{tag}</option>)}</select>}
            {statusOptions.length > 0 && <select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="All">All statuses</option>{statusOptions.map((status) => <option key={status}>{status}</option>)}</select>}
            <select aria-label="Sort records" value={sortField} onChange={(event) => setSortField(event.target.value)}>{config.type === 'company' ? <><option value="name">Name</option><option value="date">Date added</option></> : config.type === 'contact' ? <><option value="name">Name</option><option value="date">Last contacted</option></> : <><option value="date">Application date</option><option value="name">Role</option></>}</select>
            <button className="sort-button" aria-label="Toggle sort direction" onClick={() => setSortAscending((value) => !value)}><ArrowDownUp size={14} /></button>
          </div>
        </div>
        {filteredRows.length ? <div className="directory-table-wrap"><table className="directory-table"><thead><tr><th>{config.type === 'application' ? 'Role' : 'Name'}</th><th>{config.type === 'company' ? 'Industry' : 'Company'}</th><th>{config.type === 'application' ? 'Status' : config.type === 'contact' ? 'Connection' : 'Size'}</th><th>{config.type === 'company' ? 'Location' : config.type === 'contact' ? 'Last contacted' : 'Applied'}</th><th /></tr></thead>
          <tbody>{filteredRows.map((row) => <tr key={row.id} onClick={() => setEditing(row.id)}>
            <td><div className="company-cell"><span className={`company-avatar avatar-${row.id.charCodeAt(row.id.length - 1) % 7}`}>{row.name.slice(0, 1)}</span><span><strong>{row.name}</strong><small>{row.type === 'company' ? row.location : row.subtitle}</small></span></div></td>
            <td>{row.type === 'company' ? row.subtitle : row.company}</td>
            <td>{row.status ? <span className={`status-badge status-${row.status.toLowerCase()}`}><i />{row.status}</span> : row.company}</td>
            <td className="date-cell">{row.type === 'company' ? row.location : row.date ? format(parseISO(row.date), 'MMM d, yyyy') : '—'}</td>
            <td><div className="row-actions"><button className="row-action-button" onClick={(event) => { event.stopPropagation(); setEditing(row.id) }}>Edit</button><button className="row-delete-button" aria-label={`Delete ${row.name}`} onClick={(event) => { event.stopPropagation(); remove(row) }}><Trash2 size={14} /></button></div></td>
          </tr>)}</tbody></table></div> : <div className="directory-empty"><span><Search size={20} /></span><h3>{rows.length ? 'No matching records' : `No ${config.title.toLowerCase()} yet`}</h3><p>{rows.length ? 'Try adjusting your search or filters.' : `Add your first ${config.type} to start organizing your career search.`}</p>{!rows.length && <button className="button button-secondary" onClick={() => openAdd(config.type)}><Plus size={15} /> {config.addLabel}</button>}</div>}
      </div>
      {editing && <RecordDialog type={config.type} recordId={editing} onClose={() => setEditing(null)} />}
    </section>
  )
}

export function TasksPage() {
  const { data, toggleTask, deleteRecord } = useCareerData()
  const { openAdd } = useOutletContext<AppShellContext>()
  const today = startOfToday()
  const open = data.tasks.filter((task) => !task.done).sort((first, second) => first.dueAt.localeCompare(second.dueAt))
  const completed = data.tasks.filter((task) => task.done)
  const [timeFilter, setTimeFilter] = useState('All open')
  const [priorityFilter, setPriorityFilter] = useState('All priorities')
  const [editing, setEditing] = useState<string | null>(null)
  const visibleOpen = open.filter((task) => {
    const dueDate = parseISO(task.dueAt)
    const matchesTime = timeFilter === 'All open'
      || (timeFilter === 'Overdue' && isBefore(dueDate, today))
      || (timeFilter === 'Today' && isSameDay(dueDate, today))
      || (timeFilter === 'Upcoming' && isAfter(startOfDay(dueDate), today))
    return matchesTime && (priorityFilter === 'All priorities' || task.priority === priorityFilter)
  })
  const handleDelete = (id: string) => {
    if (window.confirm('Delete this task? This action cannot be undone.')) deleteRecord('task', id)
  }
  return <section className="directory-page">
    <div className="page-title-row"><div><p className="eyebrow">STAY ON TRACK</p><h1>Tasks & follow-ups</h1><p className="page-description">A manageable list of thoughtful next steps.</p></div><button className="button button-primary" onClick={() => openAdd('task')}><Plus size={16} /> Add task</button></div>
    <div className="tasks-layout">
      <div className="panel task-board"><PanelTitle title="To do" count={open.length} /><div className="task-board-filters"><select aria-label="Filter tasks by date" value={timeFilter} onChange={(event) => setTimeFilter(event.target.value)}><option>All open</option><option>Today</option><option>Upcoming</option><option>Overdue</option></select><select aria-label="Filter tasks by priority" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option>All priorities</option><option>High</option><option>Medium</option><option>Low</option></select></div><div className="full-task-list">{visibleOpen.map((task) => {
        const overdue = isBefore(parseISO(task.dueAt), today)
        return <div className="full-task-row" key={task.id}><button className="task-check" aria-label="Mark task complete" onClick={() => toggleTask(task.id)}><Check size={12} /></button><div className="full-task-copy"><strong>{task.title}</strong><span>{getCompanyName(data, task.companyId)}</span></div><span className={`priority priority-${task.priority.toLowerCase()}`}>{task.priority}</span><time className={overdue ? 'overdue-date' : ''}>{overdue ? 'Overdue' : taskDueDateLabel(task.dueAt)}</time><button className="row-delete-button" aria-label={`Edit task ${task.title}`} onClick={() => setEditing(task.id)}><Pencil size={14} /></button><button className="row-delete-button" aria-label={`Delete ${task.title}`} onClick={() => handleDelete(task.id)}><Trash2 size={14} /></button></div>
      })}{!visibleOpen.length && <DirectoryEmpty text={open.length ? 'No tasks match these filters.' : 'Nothing on your list. You’re all caught up.'} />}</div></div>
      <div className="panel task-board"><PanelTitle title="Completed" count={completed.length} /><div className="full-task-list">{completed.map((task) => <div className="full-task-row completed-task" key={task.id}><button className="task-check checked" aria-label="Reopen task" onClick={() => toggleTask(task.id)}><Check size={12} /></button><div className="full-task-copy"><strong>{task.title}</strong><span>{getCompanyName(data, task.companyId)}</span></div><button className="row-delete-button" aria-label={`Edit task ${task.title}`} onClick={() => setEditing(task.id)}><Pencil size={14} /></button><button className="row-delete-button" aria-label={`Delete ${task.title}`} onClick={() => handleDelete(task.id)}><Trash2 size={14} /></button></div>)}{!completed.length && <DirectoryEmpty text="Completed tasks will appear here." />}</div></div>
    </div>
    {editing && <RecordDialog type="task" recordId={editing} onClose={() => setEditing(null)} />}
  </section>
}

export function CalendarPage() {
  const { data, deleteRecord } = useCareerData()
  const { openAdd } = useOutletContext<AppShellContext>()
  const [editing, setEditing] = useState<{ type: 'task' | 'event'; id: string } | null>(null)
  const handleDelete = (id: string) => { if (window.confirm('Delete this event? This action cannot be undone.')) deleteRecord('event', id) }
  return <section className="directory-page">
    <div className="page-title-row"><div><p className="eyebrow">PLAN AHEAD</p><h1>Calendar</h1><p className="page-description">Interviews, assessments, tasks and the conversations that move you forward.</p></div><button className="button button-primary" onClick={() => openAdd('event', new Date())}><Plus size={16} /> Add event</button></div>
    <div className="panel calendar-page-panel"><MonthlyCalendar data={data} onAdd={openAdd} onOpen={(type, id) => setEditing({ type, id })} onDeleteEvent={handleDelete} /></div>
    {editing && <RecordDialog type={editing.type} recordId={editing.id} onClose={() => setEditing(null)} />}
  </section>
}

export function SettingsPage() {
  const { data } = useCareerData()
  const auth = useAuth()
  const { theme, toggleTheme } = useTheme()
  const demoMode = auth.dataMode === 'demo'
  const exportDemoData = () => {
    const file = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const downloadUrl = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `careeros-${demoMode ? 'demo' : 'workspace'}-${format(new Date(), 'yyyy-MM-dd')}.json`
    link.click()
    URL.revokeObjectURL(downloadUrl)
  }
  return <section className="directory-page"><div className="page-title-row"><div><p className="eyebrow">PREFERENCES</p><h1>Settings</h1><p className="page-description">{demoMode ? 'Manage this local demo workspace.' : 'Manage your private CareerOS workspace.'}</p></div></div>
    <div className="settings-grid">
      <article className="panel settings-card"><div className="settings-icon"><Circle size={18} /></div><div><h2>{demoMode ? 'Demo workspace' : 'Private workspace'}</h2><p>{demoMode ? 'Your records are saved only in this browser using local storage. No account or server sync is configured.' : 'Your records are loaded from the authenticated CareerOS API and scoped to your account.'}</p><span className="settings-status"><i /> {demoMode ? 'Local demo mode' : 'Authenticated API mode'}</span></div></article>
      <article className="panel settings-card"><div className="settings-icon"><CalendarDays size={18} /></div><div><h2>Workspace summary</h2><p>{data.companies.length} companies · {data.contacts.length} contacts · {data.applications.length} applications</p><span className="settings-status">Sample data can be edited or removed at any time.</span></div></article>
      <article className="panel settings-card"><div className="settings-icon"><CalendarDays size={18} /></div><div><h2>Appearance</h2><p>Choose the display theme for this browser.</p><button className="button button-secondary" onClick={toggleTheme}>Switch to {theme === 'light' ? 'dark' : 'light'} mode</button></div></article>
      <article className="panel settings-card"><div className="settings-icon"><Download size={18} /></div><div><h2>{demoMode ? 'Export demo data' : 'Export workspace data'}</h2><p>{demoMode ? 'Download a JSON backup of the records saved in this browser. Nothing is uploaded.' : 'Download a JSON backup of the records in your private workspace.'}</p><button className="button button-secondary" onClick={exportDemoData}>Download backup</button></div></article>
      <article className="panel settings-card"><div className="settings-icon"><ArrowRight size={18} /></div><div><h2>{demoMode ? 'Coming next' : 'Workspace access'}</h2><p>{demoMode ? 'Secure accounts, shared database storage, reminders and calendar integrations are planned for a future milestone.' : 'Sign-in, email confirmation, and account-scoped API access are enabled for this workspace.'}</p><span className="settings-status">{demoMode ? 'No backend authentication or sync is active.' : 'Your records are private to your authenticated account.'}</span></div></article>
    </div>
  </section>
}

function PanelTitle({ title, count }: { title: string; count: number }) {
  return <div className="panel-heading"><div><h2>{title}</h2><p>{count} {count === 1 ? 'item' : 'items'}</p></div></div>
}

function DirectoryEmpty({ text }: { text: string }) {
  return <div className="empty-state"><span><Circle size={17} /></span><p>{text}</p></div>
}
