// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CareerData } from '../types'
import { CareerDataContext, type CareerDataContextValue } from '../context/careerDataContext'
import { RecordDialog } from './RecordDialog'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('RecordDialog', () => {
  it('keeps date-only values unchanged in time zones west of UTC', () => {
    vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(480)
    const task = {
      id: 'task-1', title: 'Follow up', companyId: '', dueAt: '2024-02-29',
      priority: 'Medium' as const, done: false, description: '', contactId: '',
      applicationId: '', category: '',
    }
    const data: CareerData = {
      companies: [], applications: [], contacts: [], tasks: [task], events: [], activities: [],
    }
    const context: CareerDataContextValue = {
      data,
      dataLoading: false,
      dataError: '',
      dataRetryLabel: 'Try again',
      retryDataLoad: vi.fn(),
      addRecord: vi.fn(),
      updateRecord: vi.fn(),
      deleteRecord: vi.fn(),
      toggleTask: vi.fn(),
    }

    render(
      <CareerDataContext.Provider value={context}>
        <RecordDialog type="task" recordId={task.id} onClose={vi.fn()} />
      </CareerDataContext.Provider>,
    )

    expect((screen.getByLabelText('Due date') as HTMLInputElement).value).toBe('2024-02-29')
  })
})
