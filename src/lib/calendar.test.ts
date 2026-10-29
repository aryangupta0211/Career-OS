import { describe, expect, it } from 'vitest'
import { format, isSameDay } from 'date-fns'
import { demoData } from '../data/demo'
import { getCalendarDays, getItemsForDate, getScheduledItems } from './calendar'

describe('monthly calendar helpers', () => {
  it('creates a complete Monday-first grid for leap February', () => {
    const days = getCalendarDays(new Date(2024, 1, 1))
    expect(days.length % 7).toBe(0)
    expect(days.some((day) => isSameDay(day, new Date(2024, 1, 29)))).toBe(true)
    expect(days[0]?.getDay()).toBe(1)
  })

  it('groups local events and unfinished tasks by their scheduled date', () => {
    const date = '2024-02-29T12:30:00.000Z'
    const data = {
      ...demoData,
      companies: [{ ...demoData.companies[0]!, id: 'company-1', name: 'Example' }],
      events: [{ ...demoData.events[0]!, id: 'event-1', companyId: 'company-1', startsAt: date }],
      tasks: [
        { ...demoData.tasks[0]!, id: 'task-1', companyId: 'company-1', dueAt: date, done: false },
        { ...demoData.tasks[0]!, id: 'task-2', companyId: 'company-1', dueAt: date, done: true },
      ],
    }
    const items = getScheduledItems(data)
    const selected = getItemsForDate(items, new Date(2024, 1, 29))

    expect(items).toHaveLength(2)
    expect(selected.map((item) => item.type).sort()).toEqual(['event', 'task'])
    expect(selected.every((item) => item.company === 'Example')).toBe(true)
  })

  it('keeps task due dates as local all-day dates while event times remain instants', () => {
    const task = { ...demoData.tasks[0]!, id: 'task-date-only', dueAt: '2024-03-01', done: false }
    const eventInstant = '2024-03-01T00:15:00.000Z'
    const event = { ...demoData.events[0]!, id: 'event-instant', startsAt: eventInstant }
    const items = getScheduledItems({ ...demoData, tasks: [task], events: [event] })

    expect(format(items.find((item) => item.id === task.id)!.date, 'yyyy-MM-dd')).toBe('2024-03-01')
    expect(items.find((item) => item.id === event.id)!.date.toISOString()).toBe(eventInstant)
  })

  it('covers midnight month boundaries and leap day in the calendar grid', () => {
    const days = getCalendarDays(new Date(2024, 2, 1))
    expect(format(days[0]!, 'yyyy-MM-dd')).toBe('2024-02-26')
    expect(days.some((day) => format(day, 'yyyy-MM-dd') === '2024-02-29')).toBe(true)
    expect(days.some((day) => format(day, 'yyyy-MM-dd') === '2024-03-31')).toBe(true)
  })
})
