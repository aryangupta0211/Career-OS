import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { useCareerData } from '../context/useCareerData'
import { createRecordSchema } from '../lib/recordValidation'
import type { Application, CareerEvent, Company, Contact, FollowUpTask, RecordType } from '../types'

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
    { name: 'resumeReference', label: 'Resume version' },
    { name: 'jobDescription', label: 'Role notes', type: 'textarea' },
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const dialogRef = useRef<HTMLElement | null>(null)
  const closeRef = useRef(onClose)
  const record = getCurrentRecord(type, recordId, data)
  const fields = fieldsByType[type]

  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

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

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section ref={dialogRef} className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <div className="dialog-heading">
          <div>
            <p className="eyebrow">{recordId ? 'Edit record' : 'New record'}</p>
            <h2 id="dialog-title">{recordId ? 'Update' : 'Add'} {labels[type]}</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Close dialog" onClick={onClose}>×</button>
        </div>
        <form onSubmit={(event) => { event.preventDefault(); save(new FormData(event.currentTarget)) }}>
          <div className="form-grid">
            {fields.map((field) => (
              <label className={field.type === 'textarea' ? 'form-field full-width' : 'form-field'} key={field.name}>
                <span>{field.label}{field.required ? ' *' : ''}</span>
                {field.company ? (
                  <select name={field.name} required={field.required} aria-invalid={Boolean(fieldErrors[field.name])} aria-describedby={fieldErrors[field.name] ? `error-${type}-${field.name}` : undefined} defaultValue={String(getRecordField(record, field.name) ?? '')}>
                    <option value="">No company</option>
                    {data.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                  </select>
                ) : field.relation === 'contact' ? (
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
            ))}
          </div>
          <div className="dialog-actions">
            <button className="button button-secondary" type="button" onClick={onClose}>Cancel</button>
            <button className="button button-primary" type="submit">{recordId ? 'Save changes' : `Add ${labels[type]}`}</button>
          </div>
        </form>
      </section>
    </div>
  )
}
