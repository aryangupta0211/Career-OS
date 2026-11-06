import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { useCareerData } from '../context/useCareerData'
import { createRecordSchema } from '../lib/recordValidation'
import { useAuth } from '../context/auth-context'
import { vaultApi } from '../lib/vaultApi'
import { computeApplicationCompleteness } from '../lib/completeness'
import type { Application, CareerEvent, Company, Contact, FollowUpTask, RecordType, ResumeGroup, JobDescription } from '../types'
import { CompanyResourcesTab } from './vault/CompanyResourcesTab'
import { ApplicationDocumentsTab } from './ApplicationDocumentsTab'
import { CompanySelectWithCreate } from './CompanySelectWithCreate'

interface RecordDialogProps {
  type: RecordType
  recordId?: string
  initialDate?: Date
  onClose: () => void
}

interface Field {
  name: string
  label: string
  type?: 'text' | 'url' | 'email' | 'tel' | 'date' | 'datetime-local' | 'select' | 'textarea'
  options?: string[]
  required?: boolean
  company?: boolean
  relation?: 'contact' | 'application'
  placeholder?: string
}
type EditableRecord = Company | Application | Contact | FollowUpTask | CareerEvent

const fieldsByType: Record<RecordType, Field[]> = {
  company: [
    { name: 'name', label: 'Company name', required: true },
    { name: 'industry', label: 'Industry' },
    { name: 'location', label: 'Location' },
    { name: 'website', label: 'Website', type: 'url' },
    { name: 'careersUrl', label: 'Careers page', type: 'url' },
    { name: 'linkedinUrl', label: 'LinkedIn company URL', type: 'url' },
    { name: 'size', label: 'Company size' },
    { name: 'tags', label: 'Tags', placeholder: 'Design, Remote' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ],
  application: [
    { name: 'jobTitle', label: 'Job title', required: true },
    { name: 'companyId', label: 'Company', company: true, required: true },
    { name: 'status', label: 'Status', type: 'select', options: ['Saved', 'Applied', 'Assessment', 'Interview', 'Offer', 'Rejected'] },
    { name: 'appliedAt', label: 'Application date', type: 'date' },
    { name: 'nextAction', label: 'Next action' },
    { name: 'nextFollowUpAt', label: 'Follow-up date', type: 'date' },
    { name: 'location', label: 'Location' },
    { name: 'jobUrl', label: 'Job posting URL', type: 'url' },
    { name: 'applicationUrl', label: 'Application URL', type: 'url' },
    { name: 'jobType', label: 'Job type', type: 'select', options: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Other'] },
    { name: 'workArrangement', label: 'Work arrangement', type: 'select', options: ['On-site', 'Hybrid', 'Remote'] },
    { name: 'resumeReference', label: 'Submitted Resume Version' },
    { name: 'jobDescription', label: 'Role notes / Extracted JD text', type: 'textarea' },
    { name: 'prepNotes', label: 'Interview preparation notes', type: 'textarea' },
    { name: 'notes', label: 'Application notes', type: 'textarea' },
  ],
  contact: [
    { name: 'name', label: 'Full name', required: true },
    { name: 'jobTitle', label: 'Job title' },
    { name: 'companyId', label: 'Company', company: true },
    { name: 'status', label: 'Connection status', type: 'select', options: ['Connected', 'Requested', 'Not connected'] },
    { name: 'lastContactedAt', label: 'Last contacted', type: 'date' },
    { name: 'connectionRequestedAt', label: 'Connection requested', type: 'date' },
    { name: 'connectionAcceptedAt', label: 'Connection accepted', type: 'date' },
    { name: 'nextFollowUpAt', label: 'Next follow-up', type: 'date' },
    { name: 'linkedinUrl', label: 'LinkedIn profile', type: 'url' },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'phone', label: 'Phone number', type: 'tel' },
    { name: 'tags', label: 'Tags' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ],
  task: [
    { name: 'title', label: 'Task', required: true },
    { name: 'companyId', label: 'Company', company: true },
    { name: 'dueAt', label: 'Due date', type: 'date' },
    { name: 'priority', label: 'Priority', type: 'select', options: ['Low', 'Medium', 'High'] },
    { name: 'category', label: 'Category' },
    { name: 'contactId', label: 'Contact', relation: 'contact' },
    { name: 'applicationId', label: 'Application', relation: 'application' },
    { name: 'description', label: 'Description', type: 'textarea' },
  ],
  event: [
    { name: 'title', label: 'Event title', required: true },
    { name: 'eventType', label: 'Event type', type: 'select', options: ['Interview', 'Assessment', 'Networking', 'Other'] },
    { name: 'companyId', label: 'Company', company: true },
    { name: 'startsAt', label: 'Date and time', type: 'datetime-local', required: true },
    { name: 'endsAt', label: 'End time', type: 'datetime-local' },
    { name: 'location', label: 'Location or meeting link' },
    { name: 'meetingUrl', label: 'Meeting URL', type: 'url' },
    { name: 'contactId', label: 'Contact', relation: 'contact' },
    { name: 'applicationId', label: 'Application', relation: 'application' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ],
}

const labels: Record<RecordType, string> = {
  company: 'company',
  application: 'application',
  contact: 'contact',
  task: 'task',
  event: 'event',
}

function getCurrentRecord(type: RecordType, id: string | undefined, data: ReturnType<typeof useCareerData>['data']): EditableRecord | undefined {
  if (!id) return undefined
  if (type === 'company') return data.companies.find((item) => item.id === id)
  if (type === 'application') return data.applications.find((item) => item.id === id)
  if (type === 'contact') return data.contacts.find((item) => item.id === id)
  if (type === 'task') return data.tasks.find((item) => item.id === id)
  return data.events.find((item) => item.id === id)
}

function getRecordField(record: EditableRecord | undefined, field: string): unknown {
  if (!record || !(field in record)) return undefined
  return record[field as keyof EditableRecord]
}

function inputValue(value: unknown, type: Field['type']) {
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) return value.join(', ')
  if (typeof value !== 'string') return ''
  if (type === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  if (type === 'date' || type === 'datetime-local') {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString()
    return type === 'date' ? localDate.slice(0, 10) : localDate.slice(0, 16)
  }
  return value
}

export function RecordDialog({ type, recordId, initialDate, onClose }: RecordDialogProps) {
  const { data, addRecord, updateRecord } = useCareerData()
  const auth = useAuth()
  const token = auth.session?.access_token

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [activeCompanyTab, setActiveCompanyTab] = useState<'details' | 'resources'>('details')
  const [activeAppTab, setActiveAppTab] = useState<'details' | 'documents'>('details')

  // Selected company state for inline create support
  const record = getCurrentRecord(type, recordId, data)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(String(getRecordField(record, 'companyId') ?? ''))

  // Resume groups for version selection in applications
  const [resumeGroups, setResumeGroups] = useState<ResumeGroup[]>([])
  const [jobDescriptions, setJobDescriptions] = useState<JobDescription[]>([])
  const [selectedResumeVersion, setSelectedResumeVersion] = useState<string>(String(getRecordField(record, 'resumeReference') ?? ''))

  const dialogRef = useRef<HTMLElement | null>(null)
  const closeRef = useRef(onClose)
  const fields = fieldsByType[type]

  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (type === 'application') {
      vaultApi.getResumeGroups(false, token).then(setResumeGroups).catch(() => {})
      vaultApi.getJobDescriptions(token).then(setJobDescriptions).catch(() => {})
    }
  }, [type, token])

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const dialog = dialogRef.current
    const focusable = () => [...(dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [])]
    const firstField = dialog?.querySelector<HTMLElement>('input:not([disabled]), select:not([disabled]), textarea:not([disabled])')
    ;(firstField ?? focusable()[0])?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const items = focusable()
      const first = items[0]
      const last = items.at(-1)
      if (!first || !last) {
        event.preventDefault()
      } else if (event.shiftKey && (document.activeElement === first || !dialog?.contains(document.activeElement))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !dialog?.contains(document.activeElement))) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (previouslyFocused?.isConnected) previouslyFocused.focus()
    }
  }, [])

  const save = (formData: FormData) => {
    const values = Object.fromEntries(fields.map((field) => [field.name, String(formData.get(field.name) ?? '')]))
    if (fieldErrors.companyId) {
      delete fieldErrors.companyId
    }

    // Bind custom selected company if relevant
    if (fields.some((f) => f.name === 'companyId')) {
      values.companyId = selectedCompanyId
    }
    if (fields.some((f) => f.name === 'resumeReference')) {
      values.resumeReference = selectedResumeVersion || values.resumeReference
    }

    const result = createRecordSchema(type, data).safeParse(values)
    if (!result.success) {
      const nextErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const fieldName = issue.path[0]
        if (typeof fieldName === 'string') nextErrors[fieldName] ??= issue.message
      }
      setFieldErrors(nextErrors)
      return
    }
    setFieldErrors({})
    if (recordId) updateRecord(type, recordId, result.data)
    else addRecord(type, result.data)
    onClose()
  }

  // Completeness indicator for applications
  const completeness = type === 'application' && record
    ? computeApplicationCompleteness(record as Application)
    : null

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section ref={dialogRef} className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" style={{ maxWidth: '640px' }}>
        <div className="dialog-heading">
          <div>
            <p className="eyebrow">{recordId ? 'Edit record' : 'New record'}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 id="dialog-title">{recordId ? 'Update' : 'Add'} {labels[type]}</h2>
              {completeness && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: completeness.status === 'complete' ? '#ecfdf5' : '#fef3c7',
                    color: completeness.status === 'complete' ? '#065f46' : '#92400e',
                    border: `1px solid ${completeness.status === 'complete' ? '#a7f3d0' : '#fde68a'}`,
                  }}
                  title={completeness.missingFields.map((m) => `• Missing: ${m.label}`).join('\n')}
                >
                  <span>{completeness.score}% complete</span>
                </div>
              )}
            </div>
          </div>
          <button className="icon-button" type="button" aria-label="Close dialog" onClick={onClose}>×</button>
        </div>

        {/* Company Detail Tabs */}
        {type === 'company' && recordId && (
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--line)', marginBottom: '16px' }}>
            <button
              type="button"
              className={`vault-tab-button ${activeCompanyTab === 'details' ? 'active' : ''}`}
              style={{ fontSize: '13px', padding: '8px 12px' }}
              onClick={() => setActiveCompanyTab('details')}
            >
              Company Details
            </button>
            <button
              type="button"
              className={`vault-tab-button ${activeCompanyTab === 'resources' ? 'active' : ''}`}
              style={{ fontSize: '13px', padding: '8px 12px' }}
              onClick={() => setActiveCompanyTab('resources')}
            >
              Vault Resources & Documents
            </button>
          </div>
        )}

        {/* Application Detail Tabs */}
        {type === 'application' && recordId && (
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--line)', marginBottom: '16px' }}>
            <button
              type="button"
              className={`vault-tab-button ${activeAppTab === 'details' ? 'active' : ''}`}
              style={{ fontSize: '13px', padding: '8px 12px' }}
              onClick={() => setActiveAppTab('details')}
            >
              Application Details
            </button>
            <button
              type="button"
              className={`vault-tab-button ${activeAppTab === 'documents' ? 'active' : ''}`}
              style={{ fontSize: '13px', padding: '8px 12px' }}
              onClick={() => setActiveAppTab('documents')}
            >
              Application Documents
            </button>
          </div>
        )}

        {/* Sub-tab view: Company Resources */}
        {type === 'company' && recordId && activeCompanyTab === 'resources' ? (
          <div style={{ padding: '0 4px 16px' }}>
            <CompanyResourcesTab
              companyId={recordId}
              companyName={(record as Company)?.name || 'Company'}
            />
          </div>
        ) : type === 'application' && recordId && activeAppTab === 'documents' ? (
          /* Sub-tab view: Application Documents */
          <div style={{ padding: '0 4px 16px' }}>
            <ApplicationDocumentsTab
              applicationId={recordId}
              jobTitle={(record as Application)?.jobTitle || 'Application'}
              resumeReference={(record as Application)?.resumeReference}
            />
          </div>
        ) : (
          /* Form for Main Record */
          <form onSubmit={(event) => { event.preventDefault(); save(new FormData(event.currentTarget)) }}>
            <div className="form-grid">
              {fields.map((field) => {
                if (field.company) {
                  return (
                    <div key={field.name} className="form-field">
                      <CompanySelectWithCreate
                        label={field.label}
                        required={field.required}
                        value={selectedCompanyId}
                        onChange={(cid) => {
                          setSelectedCompanyId(cid)
                          if (fieldErrors.companyId) {
                            setFieldErrors((prev) => {
                              const n = { ...prev }
                              delete n.companyId
                              return n
                            })
                          }
                        }}
                      />
                      {fieldErrors.companyId && <span className="form-error" role="alert">{fieldErrors.companyId}</span>}
                    </div>
                  )
                }

                if (type === 'application' && field.name === 'resumeReference') {
                  return (
                    <div key={field.name} className="form-field">
                      <label>
                        <span>{field.label}</span>
                        <select
                          value={selectedResumeVersion}
                          onChange={(e) => setSelectedResumeVersion(e.target.value)}
                        >
                          <option value="">-- Choose submitted resume version --</option>
                          {resumeGroups.map((group) =>
                            group.versions.map((v) => (
                              <option key={v.id} value={`${group.name} (${v.versionLabel})`}>
                                {group.name} — {v.versionLabel} {v.isCurrent ? '(Current)' : ''}
                              </option>
                            ))
                          )}
                          {/* Fallback option if custom text already stored */}
                          {selectedResumeVersion && !resumeGroups.some((g) => g.versions.some((v) => `${g.name} (${v.versionLabel})` === selectedResumeVersion)) && (
                            <option value={selectedResumeVersion}>{selectedResumeVersion} (Legacy/Custom)</option>
                          )}
                        </select>
                      </label>
                    </div>
                  )
                }

                if (type === 'application' && field.name === 'jobDescription') {
                  return (
                    <div key={field.name} className="form-field full-width">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 500 }}>{field.label}</span>
                        {jobDescriptions.length > 0 && (
                          <select
                            style={{ fontSize: '11px', padding: '3px 6px', maxWidth: '240px' }}
                            onChange={(e) => {
                              const found = jobDescriptions.find((j) => j.id === e.target.value)
                              if (found) {
                                const descArea = document.querySelector('textarea[name="jobDescription"]') as HTMLTextAreaElement
                                if (descArea) descArea.value = found.descriptionText || found.responsibilities || ''
                              }
                            }}
                          >
                            <option value="">-- Copy from saved Vault JD --</option>
                            {jobDescriptions.map((j) => (
                              <option key={j.id} value={j.id}>
                                {j.title} {j.company?.name ? `(${j.company.name})` : ''}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      <textarea
                        name={field.name}
                        aria-invalid={Boolean(fieldErrors[field.name])}
                        aria-describedby={fieldErrors[field.name] ? `error-${type}-${field.name}` : undefined}
                        defaultValue={inputValue(getRecordField(record, field.name), field.type)}
                      />
                    </div>
                  )
                }

                return (
                  <label className={field.type === 'textarea' ? 'form-field full-width' : 'form-field'} key={field.name}>
                    <span>{field.label}{field.required ? ' *' : ''}</span>
                    {field.relation === 'contact' ? (
                      <select name={field.name} aria-invalid={Boolean(fieldErrors[field.name])} aria-describedby={fieldErrors[field.name] ? `error-${type}-${field.name}` : undefined} defaultValue={String(getRecordField(record, field.name) ?? '')}>
                        <option value="">No contact</option>
                        {data.contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}</option>)}
                      </select>
                    ) : field.relation === 'application' ? (
                      <select name={field.name} aria-invalid={Boolean(fieldErrors[field.name])} aria-describedby={fieldErrors[field.name] ? `error-${type}-${field.name}` : undefined} defaultValue={String(getRecordField(record, field.name) ?? '')}>
                        <option value="">No application</option>
                        {data.applications.map((application) => <option key={application.id} value={application.id}>{application.jobTitle}</option>)}
                      </select>
                    ) : field.type === 'select' ? (
                      <select name={field.name} aria-invalid={Boolean(fieldErrors[field.name])} aria-describedby={fieldErrors[field.name] ? `error-${type}-${field.name}` : undefined} defaultValue={String(getRecordField(record, field.name) ?? field.options?.[0] ?? '')}>
                        {field.options?.map((option) => <option key={option}>{option}</option>)}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea name={field.name} aria-invalid={Boolean(fieldErrors[field.name])} aria-describedby={fieldErrors[field.name] ? `error-${type}-${field.name}` : undefined} defaultValue={inputValue(getRecordField(record, field.name), field.type)} />
                    ) : (
                      <input
                        name={field.name}
                        type={field.type ?? 'text'}
                        required={field.required}
                        aria-invalid={Boolean(fieldErrors[field.name])}
                        aria-describedby={fieldErrors[field.name] ? `error-${type}-${field.name}` : undefined}
                        defaultValue={inputValue(getRecordField(record, field.name), field.type) || (!record && initialDate && field.name === 'dueAt' ? format(initialDate, 'yyyy-MM-dd') : !record && initialDate && field.name === 'startsAt' ? format(initialDate, "yyyy-MM-dd'T'HH:mm") : '')}
                        placeholder={field.placeholder}
                      />
                    )}
                    {fieldErrors[field.name] && <span id={`error-${type}-${field.name}`} className="form-error" role="alert">{fieldErrors[field.name]}</span>}
                  </label>
                )
              })}
            </div>
            <div className="dialog-actions">
              <button className="button button-secondary" type="button" onClick={onClose}>Cancel</button>
              <button className="button button-primary" type="submit">{recordId ? 'Save changes' : `Add ${labels[type]}`}</button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}
