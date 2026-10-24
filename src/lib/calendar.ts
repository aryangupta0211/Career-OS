import { addDays, endOfMonth, endOfWeek, isSameDay, isValid, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import type { CareerData } from '../types'

export interface CalendarItem {
  id: string
  type: 'event' | 'task'
  title: string
  date: Date
  time: string
  category: string
  company: string
  location: string
}

export function getCalendarDays(month: Date) {
  const firstDay = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
  const lastDay = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
  const days: Date[] = []

  for (let day = firstDay; day <= lastDay; day = addDays(day, 1)) days.push(day)
  return days
}

export function getScheduledItems(data: CareerData): CalendarItem[] {
  const companyNames = new Map(data.companies.map((company) => [company.id, company.name]))
  const events: CalendarItem[] = data.events.flatMap((event) => {
    const date = parseISO(event.startsAt)
    if (!isValid(date)) return []
    return [{
      id: event.id,
      type: 'event',
      title: event.title,
      date,
      time: event.startsAt,
      category: event.eventType,
      company: companyNames.get(event.companyId) ?? '',
      location: event.location,
    }]
  })
  const tasks: CalendarItem[] = data.tasks.flatMap((task) => {
    if (task.done || !task.dueAt) return []
    const date = parseISO(task.dueAt)
    if (!isValid(date)) return []
    return [{
      id: task.id,
      type: 'task',
      title: task.title,
      date,
      time: '',
      category: 'Task',
      company: companyNames.get(task.companyId) ?? '',
      location: '',
    }]
  })

  return [...events, ...tasks].sort((first, second) => first.date.getTime() - second.date.getTime())
}

export function getItemsForDate(items: CalendarItem[], date: Date) {
  return items.filter((item) => isSameDay(item.date, date))
}
