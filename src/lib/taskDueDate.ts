import { format, parseISO } from 'date-fns'

export function taskDueDateLabel(value: string) {
  return value ? format(parseISO(value), 'MMM d') : 'No due date'
}
