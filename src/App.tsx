import { Suspense, lazy } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { DemoCareerDataProvider } from './context/CareerData'
import { ThemeProvider } from './context/ThemeProvider'

const Dashboard = lazy(() => import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })))
const DirectoryPage = lazy(() => import('./pages/DirectoryPages').then((module) => ({ default: module.DirectoryPage })))
const TasksPage = lazy(() => import('./pages/DirectoryPages').then((module) => ({ default: module.TasksPage })))
const CalendarPage = lazy(() => import('./pages/DirectoryPages').then((module) => ({ default: module.CalendarPage })))
const SettingsPage = lazy(() => import('./pages/DirectoryPages').then((module) => ({ default: module.SettingsPage })))

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

function NotFoundPage() {
  return <section className="directory-empty not-found"><span>404</span><h1>Page not found</h1><p>This page doesn’t exist in your CareerOS workspace.</p><a className="button button-secondary" href="/">Back to overview</a></section>
}

export default function App() {
  return <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <DemoCareerDataProvider>
        <BrowserRouter>
          <Suspense fallback={<div className="route-loading">Opening your workspace…</div>}>
            <Routes>
              <Route element={<AppShell />}>
                <Route index element={<Dashboard />} />
                <Route path="applications" element={<DirectoryPage />} />
                <Route path="companies" element={<DirectoryPage />} />
                <Route path="contacts" element={<DirectoryPage />} />
                <Route path="tasks" element={<TasksPage />} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </DemoCareerDataProvider>
    </ThemeProvider>
  </QueryClientProvider>
}
