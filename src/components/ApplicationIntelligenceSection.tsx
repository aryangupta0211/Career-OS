import { useState, useEffect } from 'react'
import { Sparkles, CheckCircle2, ListTodo, Plus, Award } from 'lucide-react'
import { intelligenceApi } from '../lib/intelligenceApi'
import type { ResumeMatchScore, PreparationTaskSuggestion } from '../lib/intelligence/types'
import { useCareerData } from '../context/useCareerData'

interface ApplicationIntelligenceSectionProps {
  applicationId: string
  currentResumeVersionId?: string
  onSelectResumeVersion?: (versionId: string) => void
}

export function ApplicationIntelligenceSection({
  applicationId,
  currentResumeVersionId,
  onSelectResumeVersion,
}: ApplicationIntelligenceSectionProps) {
  const { addRecord } = useCareerData()
  const [activeTab, setActiveTab] = useState<'resume' | 'prep'>('resume')

  // Resume matches state
  const [matches, setMatches] = useState<ResumeMatchScore[]>([])
  const [loadingMatches, setLoadingMatches] = useState(false)
  const [matchError, setMatchError] = useState<string | null>(null)

  // Prep checklist state
  const [prepTasks, setPrepTasks] = useState<PreparationTaskSuggestion[]>([])
  const [loadingPrep, setLoadingPrep] = useState(false)
  const [prepError, setPrepError] = useState<string | null>(null)
  const [createdTasksCount, setCreatedTasksCount] = useState<number | null>(null)

  useEffect(() => {
    if (!applicationId) return
    loadResumeMatches()
  }, [applicationId])

  const loadResumeMatches = async () => {
    setLoadingMatches(true)
    setMatchError(null)
    try {
      const data = await intelligenceApi.getResumeMatches(applicationId)
      setMatches(data)
    } catch (err: any) {
      setMatchError(err.message || 'Failed to load resume match suggestions.')
    } finally {
      setLoadingMatches(false)
    }
  }

  const handleGeneratePrep = async () => {
    setLoadingPrep(true)
    setPrepError(null)
    setCreatedTasksCount(null)
    try {
      const tasks = await intelligenceApi.generatePreparationTasks(applicationId)
      setPrepTasks(tasks)
    } catch (err: any) {
      setPrepError(err.message || 'Failed to generate interview preparation tasks.')
    } finally {
      setLoadingPrep(false)
    }
  }

  const handleToggleTaskSelection = (taskId: string) => {
    setPrepTasks(
      prepTasks.map((t) => (t.id === taskId ? { ...t, selected: !t.selected } : t))
    )
  }

  const handleCreateSelectedTasks = async () => {
    const selected = prepTasks.filter((t) => t.selected !== false)
    if (selected.length === 0) return

    setLoadingPrep(true)
    try {
      // Create via intelligenceApi or local addRecord
      await intelligenceApi.createPreparationTasks(
        applicationId,
        selected.map((t) => ({
          title: t.title,
          description: t.description,
          priority: t.priority,
          category: t.category,
        }))
      )

      // Also sync to active careerData store for live UI updates
      for (const t of selected) {
        addRecord('task', {
          title: t.title,
          description: t.description,
          priority: t.priority,
          category: t.category,
          applicationId,
          done: 'false',
        })
      }

      setCreatedTasksCount(selected.length)
      setPrepTasks([])
    } catch (err: any) {
      setPrepError(err.message || 'Failed to create preparation tasks.')
    } finally {
      setLoadingPrep(false)
    }
  }

  return (
    <div
      style={{
        border: '1px solid var(--line)',
        borderRadius: '8px',
        background: 'var(--surface)',
        overflow: 'hidden',
        marginTop: '16px',
      }}
    >
      {/* Sub Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--line)',
          background: 'var(--surface-muted)',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('resume')}
          style={{
            flex: 1,
            padding: '10px',
            fontSize: '12px',
            fontWeight: 500,
            border: 'none',
            background: activeTab === 'resume' ? 'var(--surface)' : 'transparent',
            color: activeTab === 'resume' ? 'var(--accent)' : 'var(--muted)',
            cursor: 'pointer',
            borderBottom: activeTab === 'resume' ? '2px solid var(--accent)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <Award size={14} /> Resume Recommendations
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('prep')}
          style={{
            flex: 1,
            padding: '10px',
            fontSize: '12px',
            fontWeight: 500,
            border: 'none',
            background: activeTab === 'prep' ? 'var(--surface)' : 'transparent',
            color: activeTab === 'prep' ? 'var(--accent)' : 'var(--muted)',
            cursor: 'pointer',
            borderBottom: activeTab === 'prep' ? '2px solid var(--accent)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <ListTodo size={14} /> Interview Preparation
        </button>
      </div>

      <div style={{ padding: '14px' }}>
        {/* Tab 1: Resume Recommendations */}
        {activeTab === 'resume' && (
          <div>
            {loadingMatches ? (
              <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: 'var(--muted)' }}>
                Calculating deterministic skill coverage and role alignment...
              </div>
            ) : matchError ? (
              <div style={{ padding: '10px', color: '#b91c1c', fontSize: '12px' }}>{matchError}</div>
            ) : matches.length === 0 ? (
              <div style={{ padding: '14px', textAlign: 'center', color: 'var(--muted)', fontSize: '12px' }}>
                No active resumes found in Vault to evaluate against this role.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {matches.map((m) => {
                  const isCurrent = currentResumeVersionId === m.resumeVersionId
                  const badgeColor =
                    m.relevanceTier === 'High' ? '#16a34a' : m.relevanceTier === 'Medium' ? '#d97706' : '#6b7280'

                  return (
                    <div
                      key={m.resumeVersionId}
                      style={{
                        padding: '12px',
                        border: isCurrent ? '1.5px solid var(--accent)' : '1px solid var(--line)',
                        borderRadius: '6px',
                        background: isCurrent ? 'rgba(99, 102, 241, 0.04)' : 'var(--surface)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <strong style={{ fontSize: '13px', color: 'var(--ink)' }}>{m.resumeLabel}</strong>
                          {m.targetRole && (
                            <span style={{ fontSize: '11px', color: 'var(--muted)', marginLeft: '8px' }}>
                              ({m.targetRole})
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: `${badgeColor}15`,
                              color: badgeColor,
                            }}
                          >
                            {m.score}% Match ({m.relevanceTier})
                          </span>

                          {onSelectResumeVersion && (
                            <button
                              type="button"
                              className={isCurrent ? 'button button-secondary' : 'button button-primary'}
                              style={{ fontSize: '11px', height: '26px', padding: '0 8px' }}
                              onClick={() => onSelectResumeVersion(m.resumeVersionId)}
                              disabled={isCurrent}
                            >
                              {isCurrent ? 'Attached' : 'Attach Version'}
                            </button>
                          )}
                        </div>
                      </div>

                      <p style={{ margin: 0, fontSize: '11px', color: 'var(--muted)' }}>{m.explanation}</p>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {m.matchedSkills.map((s) => (
                          <span
                            key={s}
                            style={{
                              fontSize: '10px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: '#dcfce7',
                              color: '#15803d',
                              fontWeight: 500,
                            }}
                          >
                            ✓ {s}
                          </span>
                        ))}
                        {m.missingRequiredSkills.map((s) => (
                          <span
                            key={s}
                            style={{
                              fontSize: '10px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: '#fee2e2',
                              color: '#b91c1c',
                            }}
                          >
                            ✕ {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Interview Preparation */}
        {activeTab === 'prep' && (
          <div>
            {createdTasksCount !== null && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: '#dcfce7',
                  color: '#15803d',
                  fontSize: '12px',
                  marginBottom: '12px',
                }}
              >
                <CheckCircle2 size={16} />
                <span>Successfully added {createdTasksCount} interview preparation tasks to your Tasks workspace!</span>
              </div>
            )}

            {prepError && (
              <div style={{ padding: '8px', color: '#b91c1c', fontSize: '12px', marginBottom: '8px' }}>
                {prepError}
              </div>
            )}

            {prepTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px' }}>
                <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 12px 0' }}>
                  Generate a deterministic preparation checklist customized to the skills and technical topics required for this job.
                </p>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={handleGeneratePrep}
                  disabled={loadingPrep}
                  style={{ fontSize: '12px' }}
                >
                  <Sparkles size={14} />
                  {loadingPrep ? 'Analyzing Requirements...' : 'Generate Preparation Checklist'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    Select preparation topics to add to your workspace tasks:
                  </span>
                  <button
                    type="button"
                    className="button button-primary"
                    style={{ fontSize: '11px', height: '28px' }}
                    onClick={handleCreateSelectedTasks}
                    disabled={loadingPrep}
                  >
                    <Plus size={14} /> Add Selected Tasks
                  </button>
                </div>

                {prepTasks.map((task) => (
                  <div
                    key={task.id}
                    style={{
                      padding: '10px',
                      border: '1px solid var(--line)',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={task.selected !== false}
                      onChange={() => handleToggleTaskSelection(task.id)}
                      style={{ marginTop: '3px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ fontSize: '12px', color: 'var(--ink)' }}>{task.title}</strong>
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: 'var(--surface-muted)',
                            color: 'var(--muted)',
                          }}
                        >
                          {task.category}
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            color: task.priority === 'High' ? 'var(--accent)' : 'var(--muted)',
                          }}
                        >
                          {task.priority} Priority
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px', whiteSpace: 'pre-line' }}>
                        {task.subtopics.map((st) => `• ${st}`).join('   ')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
