import { describe, expect, it } from 'vitest'
import { addDays, startOfDay } from 'date-fns'
import { demoData } from '../data/demo'
import { getUpcomingFollowUps } from './followUps'

describe('upcoming follow-ups', () => {
  it('combines task, application, and contact follow-ups without same-date duplicates', () => {
    const today = startOfDay(new Date())
    const dueDate = addDays(today, 2).toISOString()
    const data = {
      ...demoData,
      tasks: [{ ...demoData.tasks[0]!, id: 'task-one', applicationId: 'app-1', contactId: 'ct-1', dueAt: dueDate, done: false }],
      applications: [
        { ...demoData.applications[0]!, id: 'app-1', nextFollowUpAt: dueDate },
        { ...demoData.applications[1]!, id: 'app-2', nextFollowUpAt: dueDate },
      ],
      contacts: [
        { ...demoData.contacts[0]!, id: 'ct-1', nextFollowUpAt: dueDate },
        { ...demoData.contacts[1]!, id: 'ct-2', nextFollowUpAt: dueDate },
      ],
    }

    const actions = getUpcomingFollowUps(data)

    expect(actions.map(({ recordType, id }) => `${recordType}:${id}`)).toEqual([
      'task:task-one',
      'application:app-2',
      'contact:ct-2',
    ])
  })

  it('does not count completed tasks or rejected applications', () => {
    const data = {
      ...demoData,
      tasks: [{ ...demoData.tasks[0]!, done: true }],
      applications: [{ ...demoData.applications[0]!, status: 'Rejected' as const, nextFollowUpAt: new Date().toISOString() }],
      contacts: [],
    }
    expect(getUpcomingFollowUps(data)).toEqual([])
  })
})
