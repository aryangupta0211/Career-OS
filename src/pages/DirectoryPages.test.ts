import { describe, expect, it } from 'vitest'
import { taskDueDateLabel } from '../lib/taskDueDate'

describe('task due date labels', () => {
  it('labels tasks without due dates instead of formatting an invalid date', () => {
    expect(taskDueDateLabel('')).toBe('No due date')
    expect(taskDueDateLabel('2026-10-29')).toBe('Oct 29')
  })
})
