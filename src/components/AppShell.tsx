import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell, BriefcaseBusiness, Building2, CalendarDays, CheckSquare, ChevronDown, ChevronLeft,
  ChevronRight, CircleHelp, FolderArchive, LayoutDashboard, LogOut, Moon, Plus, Search, Settings, Sun, Users, X,
} from 'lucide-react'
import { getCompanyName } from '../data/demo'
import { useCareerData } from '../context/useCareerData'
import { useAuth } from '../context/auth-context'
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
  { label: 'Vault', to: '/vault', icon: FolderArchive },
]

const addOptions: { type: RecordType; label: string; icon: typeof BriefcaseBusiness }[] = [
  { type: 'application', label: 'Application', icon: BriefcaseBusiness },
  { type: 'company', label: 'Company', icon: Building2 },
  { type: 'contact', label: 'Contact', icon: Users },
  { type: 'task', label: 'Task', icon: CheckSquare },
  { type: 'event', label: 'Event', icon: CalendarDays },
]

const pathTitles: Record<string, string> = {
  '/': 'Overview',
  '/applications': 'Applications',
  '/companies': 'Companies',
  '/contacts': 'Contacts',
  '/tasks': 'Tasks & follow-ups',
  '/calendar': 'Calendar',
  '/settings': 'Settings',
  '/profile': 'My profile',
  '/vault': 'Career Vault',
  '/vault/resumes': 'Resume Vault',
  '/vault/jobs': 'Job Descriptions',
  '/vault/all': 'All Documents',
  '/vault/trash': 'Vault Trash',
}

type Dropdown = 'profile-top' | 'profile-sidebar' | 'notifications' | 'quick-add' | null
const sidebarStorageKey = 'careeros-sidebar-collapsed-v1'

function readSidebarPreference() {
  try {
    return localStorage.getItem(sidebarStorageKey) === 'true'
  } catch (error) {
    console.warn('CareerOS could not read the saved sidebar preference.', error)
    return false
  }
}

function profileName(auth: ReturnType<typeof useAuth>) {
  const metadataName = auth.session?.user.user_metadata?.full_name
  if (typeof metadataName === 'string' && metadataName.trim()) return metadataName.trim()
  if (auth.user?.name.trim()) return auth.user.name.trim()
  const emailName = auth.user?.email.split('@')[0] ?? auth.session?.user.email?.split('@')[0]
  return emailName || 'CareerOS member'
}

function initialsFor(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('')
}

export function AppShell() {
  const { data, dataLoading, dataError, dataRetryLabel, retryDataLoad } = useCareerData()
  const auth = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [addType, setAddType] = useState<RecordType | null>(null)
  const [dropdown, setDropdown] = useState<Dropdown>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarPreference)
  const [signOutError, setSignOutError] = useState('')
  const [addInitialDate, setAddInitialDate] = useState<Date | undefined>()
  const profileHasUnsavedChanges = useRef(false)
  const setProfileUnsavedChanges = useCallback((hasChanges: boolean) => {
    profileHasUnsavedChanges.current = hasChanges
  }, [])
  const searchInputRef = useRef<HTMLInputElement>(null)
  const menuName = profileName(auth)
  const email = auth.user?.email ?? auth.session?.user.email ?? 'Browser-local demo'
  const initials = initialsFor(menuName)
  const title = pathTitles[location.pathname] ?? 'CareerOS'
  const query = search.trim().toLowerCase()

  useEffect(() => {
    try {
      localStorage.setItem(sidebarStorageKey, String(sidebarCollapsed))
    } catch (error) {
      console.error('CareerOS could not save the sidebar preference.', error)
    }
  }, [sidebarCollapsed])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDropdown(null)
        setSidebarOpen(false)
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Element && !event.target.closest('[data-app-menu]')) setDropdown(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('pointerdown', handlePointerDown)
    }
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

  const toggleDropdown = (next: Exclude<Dropdown, null>) => {
    setDropdown((current) => current === next ? null : next)
  }
  const mayLeaveProfile = () => !profileHasUnsavedChanges.current
    || window.confirm('You have unsaved profile changes. Leave this page and discard them?')
  const navigateSafely = (path: string) => {
    if (!mayLeaveProfile()) return false
    navigate(path)
    return true
  }
  const handleNavigationClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    if (!mayLeaveProfile()) event.preventDefault()
    else closeNavigation()
  }
  const goToSearch = (path: string) => {
    if (!navigateSafely(`${path}?q=${encodeURIComponent(search.trim())}`)) return
    setSearch('')
  }
  const openAdd = (type: RecordType, initialDate?: Date) => {
    setAddInitialDate(initialDate)
    setAddType(type)
    setDropdown(null)
  }
  const signOut = async () => {
    if (!mayLeaveProfile()) return
    setSignOutError('')
    try {
      await auth.signOut()
      setDropdown(null)
      navigate('/auth/login', { replace: true })
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : 'Could not sign out. Please try again.')
    }
  }
  const closeNavigation = () => setSidebarOpen(false)

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {sidebarOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={closeNavigation} />}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-row">
          <Link className="brand-home" to="/" aria-label="CareerOS overview" onClick={closeNavigation}>
            <span className="brand-mark">c</span><span className="brand-name">CareerOS</span>
          </Link>
          <button className="sidebar-collapse icon-button" aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}>
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          <button className="mobile-close icon-button" aria-label="Close navigation" onClick={closeNavigation}><X size={17} /></button>
        </div>
        <div className="workspace-switcher">
          <span className="workspace-avatar">{auth.dataMode === 'demo' ? 'D' : initials.slice(0, 1)}</span>
          <span className="workspace-copy"><strong>{auth.dataMode === 'demo' ? 'Demo workspace' : 'Personal workspace'}</strong><small>{auth.dataMode === 'demo' ? 'Saved in this browser' : 'Private workspace'}</small></span>
        </div>
        <div className="sidebar-navigation">
          <div className="sidebar-section-label">Workspace</div>
          <nav className="primary-nav" aria-label="Main navigation">
            {navigation.map(({ label, to, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === '/'} title={label} aria-label={label} onClick={handleNavigationClick} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
                {label === 'Tasks' && data.tasks.filter((task) => !task.done).length > 0 && <span className="nav-count">{data.tasks.filter((task) => !task.done).length}</span>}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-user-row">
            <div className="sidebar-profile-wrap" data-app-menu>
              <button className="user-card" aria-label="Open sidebar profile menu" aria-expanded={dropdown === 'profile-sidebar'} aria-haspopup="menu" onClick={() => toggleDropdown('profile-sidebar')}>
                <span className="user-avatar">{initials}</span>
                <span className="user-copy"><strong>{menuName}</strong><small>{email}</small></span>
                <ChevronDown size={15} />
              </button>
              {dropdown === 'profile-sidebar' && <ProfileMenu
                name={menuName}
                email={email}
                loading={auth.loading}
                hasSession={Boolean(auth.session)}
                signOutError={signOutError}
                onNavigate={(path) => { if (navigateSafely(path)) { setDropdown(null); closeNavigation() } }}
                onSignOut={() => { void signOut() }}
              />}
            </div>
            <Link className="sidebar-settings icon-button" to="/settings" aria-label="Settings" title="Settings" onClick={handleNavigationClick}><Settings size={17} /></Link>
          </div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu icon-button" aria-label="Open navigation" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(true)}><span className="mobile-menu-lines" /></button>
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
            <div className="quick-add-wrap" data-app-menu>
              <button className="button button-primary quick-add-button" aria-expanded={dropdown === 'quick-add'} aria-haspopup="menu" onClick={() => toggleDropdown('quick-add')}><Plus size={16} /> <span>Add new</span></button>
              {dropdown === 'quick-add' && <div className="quick-add-menu" role="menu">{addOptions.map(({ type, label, icon: Icon }) => <button role="menuitem" key={type} onClick={() => openAdd(type)}><Icon size={16} /> <span>{label}</span><Plus size={13} className="quick-add-item-plus" /></button>)}</div>}
            </div>
            <button className="icon-button theme-toggle" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} title={`${theme === 'light' ? 'Dark' : 'Light'} mode`} onClick={toggleTheme}>{theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}</button>
            <div className="notice-wrap" data-app-menu>
              <button className={`icon-button notification-button ${dropdown === 'notifications' ? 'notice-active' : ''}`} aria-label="Notifications" aria-expanded={dropdown === 'notifications'} aria-haspopup="dialog" onClick={() => toggleDropdown('notifications')}><Bell size={17} /></button>
              {dropdown === 'notifications' && <div className="notification-popover" role="dialog" aria-label="Notifications"><strong>You’re all caught up</strong><p>Updates about upcoming interviews and follow-ups will appear here.</p><button onClick={() => { if (navigateSafely('/calendar')) setDropdown(null) }}>View calendar <span aria-hidden="true">→</span></button></div>}
            </div>
            <div className="top-profile-wrap" data-app-menu>
              <button className="top-avatar" aria-label="Open profile menu" aria-expanded={dropdown === 'profile-top'} aria-haspopup="menu" onClick={() => toggleDropdown('profile-top')}>{initials}</button>
              {dropdown === 'profile-top' && <ProfileMenu
                name={menuName}
                email={email}
                loading={auth.loading}
                hasSession={Boolean(auth.session)}
                signOutError={signOutError}
                onNavigate={(path) => { if (navigateSafely(path)) setDropdown(null) }}
                onSignOut={() => { void signOut() }}
              />}
            </div>
          </div>
        </header>
        <div className="page-content">
          {dataError
            ? <section className="data-error" role="alert">
              <h2>Workspace data unavailable</h2>
              <p>{dataError}</p>
              <button className="button button-secondary" onClick={retryDataLoad}>{dataRetryLabel}</button>
            </section>
            : dataLoading
              ? <div className="workspace-loading" role="status"><span className="loading-spinner" /> Loading your workspace…</div>
              : <Outlet context={{ openAdd, setProfileUnsavedChanges }} />}
        </div>
        <footer className="app-footer"><span>CareerOS <span className="footer-dot">·</span> Your next move, organized.</span><a href="mailto:hello@careeros.example"><CircleHelp size={14} /> Help</a></footer>
      </main>
      {addType && <RecordDialog type={addType} initialDate={addInitialDate} onClose={() => { setAddType(null); setAddInitialDate(undefined) }} />}
    </div>
  )
}

function ProfileMenu({
  name, email, loading, hasSession, signOutError, onNavigate, onSignOut,
}: {
  name: string
  email: string
  loading: boolean
  hasSession: boolean
  signOutError: string
  onNavigate: (path: string) => void
  onSignOut: () => void
}) {
  return <div className="profile-menu" role="menu">
    <div className="profile-menu-identity"><span className="user-avatar">{initialsFor(name)}</span><span><strong>{name}</strong><small>{email}</small></span></div>
    <button role="menuitem" onClick={() => onNavigate('/profile')}><Users size={15} /> View profile</button>
    <button role="menuitem" onClick={() => onNavigate('/settings')}><Settings size={15} /> Settings</button>
    {loading
      ? <p className="auth-message" role="status">Restoring your session…</p>
      : hasSession
        ? <button role="menuitem" onClick={onSignOut}><LogOut size={15} /> Sign out</button>
        : <div className="profile-auth-links"><Link role="menuitem" to="/auth/login">Sign in</Link><Link role="menuitem" to="/auth/signup">Create account</Link></div>}
    {signOutError && <p className="form-error" role="alert">{signOutError}</p>}
  </div>
}
