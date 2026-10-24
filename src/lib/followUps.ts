import { isSameDay, isValid, parseISO } from 'date-fns'
import type { CareerData, RecordType, TaskPriority } from '../types'

export interface FollowUpAction {
  id: string
  recordType: Extract<RecordType, 'task' | 'application' | 'contact'>
  title: string
  companyId: string
  dueAt: string
  priority: TaskPriority | null
}

function validDate(value: string) {
  if (!value) return undefined
  const date = parseISO(value)
  return isValid(date) ? date : undefined
}

export function getUpcomingFollowUps(data: CareerData): FollowUpAction[] {
  const tasks = data.tasks.filter((task) => !task.done && validDate(task.dueAt))
  const taskForApplicationOnDate = (applicationId: string, date: Date) => data.tasks.some((task) => {
    if (task.applicationId !== applicationId) return false
    const taskDate = validDate(task.dueAt)
    return Boolean(taskDate && isSameDay(taskDate, date))
  })
  const taskForContactOnDate = (contactId: string, date: Date) => data.tasks.some((task) => {
    if (task.contactId !== contactId) return false
    const taskDate = validDate(task.dueAt)
    return Boolean(taskDate && isSameDay(taskDate, date))
  })

  const taskActions: FollowUpAction[] = tasks.map((task) => ({
    id: task.id,
    recordType: 'task',
    title: task.title,
    companyId: task.companyId,
    dueAt: task.dueAt,
    priority: task.priority,
  }))
  const applicationActions: FollowUpAction[] = data.applications.flatMap((application) => {
    const date = validDate(application.nextFollowUpAt)
    if (!date || application.status === 'Rejected' || taskForApplicationOnDate(application.id, date)) return []
    return [{
      id: application.id,
      recordType: 'application' as const,
      title: application.nextAction || `Follow up: ${application.jobTitle}`,
      companyId: application.companyId,
      dueAt: application.nextFollowUpAt,
      priority: null,
    }]
  })
  const contactActions: FollowUpAction[] = data.contacts.flatMap((contact) => {
    const date = validDate(contact.nextFollowUpAt)
    if (!date || taskForContactOnDate(contact.id, date)) return []
    return [{
      id: contact.id,
      recordType: 'contact' as const,
      title: `Follow up with ${contact.name}`,
      companyId: contact.companyId,
      dueAt: contact.nextFollowUpAt,
      priority: null,
    }]
  })

  return [...taskActions, ...applicationActions, ...contactActions]
    .sort((first, second) => first.dueAt.localeCompare(second.dueAt))
}
