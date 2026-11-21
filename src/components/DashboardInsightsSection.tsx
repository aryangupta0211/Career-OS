import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, Clock, ArrowRight, AlertTriangle, AlertCircle } from 'lucide-react'
import { intelligenceApi } from '../lib/intelligenceApi'
import type { SmartInsightsSummary } from '../lib/intelligence/types'
import { useAuth } from '../context/auth-context'

export function DashboardInsightsSection() {
  const auth = useAuth()
  const [insights, setInsights] = useState<SmartInsightsSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    intelligenceApi
      .getSmartInsights(auth.session?.access_token)
      .then(setInsights)
      .catch((err) => console.error('Failed to load dashboard insights:', err))
      .finally(() => setLoading(false))
  }, [auth.session?.access_token])

  if (loading) {
    return (
      <div
        className="dashboard-card"
        style={{
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid var(--line)',
          background: 'var(--surface)',
          marginBottom: '20px',
        }}
      >
        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Loading CareerOS Smart Insights...</span>
      </div>
    )
  }

  if (!insights || insights.suggestedActions.length === 0) {
    return null
  }

  return (
    <div
      className="dashboard-smart-insights"
      style={{
        padding: '16px',
        borderRadius: '8px',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.04) 0%, rgba(168, 85, 247, 0.02) 100%)',
        marginBottom: '24px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={16} style={{ color: 'var(--accent)' }} />
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>
            Smart Career Insights & Suggested Actions
          </h3>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
          {insights.stats.upcomingInterviewsCount} interviews • {insights.stats.overdueTasksCount} overdue tasks
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
        {insights.suggestedActions.slice(0, 3).map((item) => {
          const isUrgent = item.severity === 'urgent'
          const isWarning = item.severity === 'warning'
          const iconColor = isUrgent ? '#ef4444' : isWarning ? '#f59e0b' : 'var(--accent)'

          return (
            <div
              key={item.id}
              style={{
                padding: '12px',
                borderRadius: '6px',
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                {isUrgent ? (
                  <AlertCircle size={16} style={{ color: iconColor, flexShrink: 0, marginTop: '2px' }} />
                ) : isWarning ? (
                  <AlertTriangle size={16} style={{ color: iconColor, flexShrink: 0, marginTop: '2px' }} />
                ) : (
                  <Clock size={16} style={{ color: iconColor, flexShrink: 0, marginTop: '2px' }} />
                )}
                <div>
                  <strong style={{ fontSize: '12px', color: 'var(--ink)', display: 'block' }}>{item.title}</strong>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--muted)', lineHeight: '1.4' }}>
                    {item.description}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                <Link
                  to={item.actionUrl}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 500,
                    color: 'var(--accent)',
                    textDecoration: 'none',
                  }}
                >
                  {item.actionLabel} <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
