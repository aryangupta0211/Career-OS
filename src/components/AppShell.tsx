import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell, BriefcaseBusiness, Building2, CalendarDays, CheckSquare, ChevronDown, CircleHelp,
  Command, LayoutDashboard, LogOut, Moon, Plus, Search, Settings, Sun, Users, X,
} from 'lucide-react'
import { getCompanyName } from '../data/demo'
import { useCareerData } from '../context/useCareerData'
import { useTheme } from '../context/useTheme'
import type { RecordType } from '../types'
import { RecordDialog } from './RecordDialog'

const navigation = [
  { label: 'Overview', to: '/', icon: LayoutDashboard },
  { label: 'Applications', to: '/applications', icon: BriefcaseBusiness },
  { label: 'Companies', to: '/companies', icon: Building2 },
  { label: 'Contacts', to: '/contacts', icon: Users },
  { label: 'Tasks', to: '/tasks', icon: CheckSquare },
  { label: 'Calendar', to: '/calendar', icon: CalendarDays },
]

const addOptions: { type: RecordType; label: string }[] = [
  { type: 'application', label: 'Application' },
  { type: 'company', label: 'Company' },
  { type: 'contact', label: 'Contact' },
  { type: 'task', label: 'Task' },
  { type: 'event', label: 'Event' },
]

const pathTitles: Record<string, string> = {
  '/': 'Overview',
  '/applications': 'Applications',
  '/companies': 'Companies',
  '/contacts': 'Contacts',
  '/tasks': 'Tasks & follow-ups',
  '/calendar': 'Calendar',
  '/settings': 'Settings',
}
export function AppShell() {
  const { data } = useCareerData()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [quickAdd, setQuickAdd] = useState(false)
  const [addType, setAddType] = useState<RecordType | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [addInitialDate, setAddInitialDate] = useState<Date | undefined>()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const title = pathTitles[location.pathname] ?? 'CareerOS'
  const query = search.trim().toLowerCase()

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', focusSearch)
    return () => window.removeEventListener('keydown', focusSearch)
  }, [])

  const results = useMemo(() => {
    if (query.length < 2) return []
    const matches = [
      ...data.companies.filter((item) => item.name.toLowerCase().includes(query)).map((item) => ({ label: item.name, detail: 'Company', path: '/companies' })),
      ...data.contacts.filter((item) => item.name.toLowerCase().includes(query) || getCompanyName(data, item.companyId).toLowerCase().includes(query)).map((item) => ({ label: item.name, detail: `Contact · ${getCompanyName(data, item.companyId)}`, path: '/contacts' })),
      ...data.applications.filter((item) => item.jobTitle.toLowerCase().includes(query) || getCompanyName(data, item.companyId).toLowerCase().includes(query)).map((item) => ({ label: item.jobTitle, detail: `Application · ${getCompanyName(data, item.companyId)}`, path: '/applications' })),
    ]
    return matches.slice(0, 6)
  }, [data, query])

  const goToSearch = (path: string) => {
    navigate(`${path}?q=${encodeURIComponent(search.trim())}`)
    setSearch('')
  }
  const openAdd = (type: RecordType, initialDate?: Date) => {
    setAddInitialDate(initialDate)
    setAddType(type)
  }

  return (
    <div className="app-shell">
      {sidebarOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark">c</div>
          <span>careeros</span>
          <button className="mobile-close icon-button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)}><X size={17} /></button>
        </div>
        <div className="workspace-switcher">
          <span className="workspace-avatar">A</span>
          <span className="workspace-copy"><strong>Personal workspace</strong><small>Free plan</small></span>
          <ChevronDown size={15} />
        </div>
        <div className="sidebar-section-label">WORKSPACE</div>
        <nav className="primary-nav" aria-label="Main navigation">
          {navigation.map(({ label, to, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setSidebarOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Icon size={17} strokeWidth={1.8} /><span>{label}</span>
              {label === 'Tasks' && data.tasks.filter((task) => !task.done).length > 0 && <span className="nav-count">{data.tasks.filter((task) => !task.done).length}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-section-label management-label">MANAGE</div>
        <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Settings size={17} strokeWidth={1.8} /><span>Settings</span></NavLink>
        <div className="sidebar-bottom">
          <div className="demo-callout"><div className="demo-dot" /><span><strong>Demo workspace</strong><small>Data stays in this browser</small></span></div>
          <button className="user-card" onClick={() => setMenuOpen((open) => !open)}>
            <span className="user-avatar">AC</span>
            <span className="user-copy"><strong>Alex Carter</strong><small>Personal account</small></span>
            <ChevronDown size={15} />
          </button>
          {menuOpen && <div className="user-menu"><button onClick={() => { navigate('/settings'); setMenuOpen(false) }}><Settings size={15} /> Settings</button><button onClick={() => setMenuOpen(false)}><LogOut size={15} /> Close menu</button></div>}
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu icon-button" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}><Command size={18} /></button>
            <span className="breadcrumb-muted">Workspace</span><span className="breadcrumb-slash">/</span><span className="breadcrumb-current">{title}</span>
          </div>
          <div className="topbar-actions">
            <div className="global-search">
              <Search size={16} />
              <input ref={searchInputRef} value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && search.trim()) goToSearch(results[0]?.path ?? '/applications') }} placeholder="Search anything..." aria-label="Search companies, contacts, applications" />
              <kbd>⌘ K</kbd>
              {query.length >= 2 && <div className="search-results">
                {results.length ? results.map((result) => <button key={`${result.detail}-${result.label}`} onClick={() => goToSearch(result.path)}><Search size={14} /><span><strong>{result.label}</strong><small>{result.detail}</small></span></button>) : <p>No matches found</p>}
              </div>}
            </div>
            <div className="quick-add-wrap">
              <button className="button button-primary quick-add-button" onClick={() => setQuickAdd((open) => !open)}><Plus size={16} /> <span>Add new</span></button>
              {quickAdd && <div className="quick-add-menu">{addOptions.map((option) => <button key={option.type} onClick={() => { setAddType(option.type); setQuickAdd(false) }}><Plus size={14} /> {option.label}</button>)}</div>}
            </div>
            <div className="notice-wrap">
              <button className="icon-button theme-toggle" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} title={`${theme === 'light' ? 'Dark' : 'Light'} mode`} onClick={toggleTheme}>{theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}</button>
            </div>
            <div className="notice-wrap">
              <button className={`icon-button notification-button ${noticeOpen ? 'notice-active' : ''}`} aria-label="Notifications" onClick={() => setNoticeOpen((open) => !open)}><Bell size={17} /><i /></button>
              {noticeOpen && <div className="notification-popover"><strong>You’re all caught up</strong><p>Upcoming interviews and follow-ups will appear here.</p><button onClick={() => { navigate('/calendar'); setNoticeOpen(false) }}>View your calendar</button></div>}
            </div>
            <div className="top-profile-wrap">
              <button className="top-avatar" aria-label="Open profile menu" aria-expanded={profileOpen} onClick={() => setProfileOpen((open) => !open)}>AC</button>
              {profileOpen && <div className="top-profile-menu"><strong>Alex Carter</strong><span>Personal demo account</span><button onClick={() => { navigate('/settings'); setProfileOpen(false) }}><Settings size={14} /> Settings</button></div>}
            </div>
          </div>
        </header>
        <div className="page-content"><Outlet context={{ openAdd }} /></div>
        <footer className="app-footer"><span>CareerOS <span className="footer-dot">·</span> Your next move, organized.</span><a href="mailto:hello@careeros.example"><CircleHelp size={14} /> Help</a></footer>
      </main>
      {addType && <RecordDialog type={addType} initialDate={addInitialDate} onClose={() => { setAddType(null); setAddInitialDate(undefined) }} />}
    </div>
  )
}
