import { describe, expect, it } from 'vitest'
import { isSameDay } from 'date-fns'
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
})
