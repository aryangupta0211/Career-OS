import { useMemo, useState } from 'react'
import { addMonths, format, isSameDay, isSameMonth, isToday, parseISO, startOfMonth, subMonths } from 'date-fns'
import { ArrowLeft, ArrowRight, CalendarPlus, CheckSquare, Clock3, MapPin, Plus, Trash2 } from 'lucide-react'
import { getCalendarDays, getItemsForDate, getScheduledItems } from '../lib/calendar'
import type { CareerData, RecordType } from '../types'

interface MonthlyCalendarProps {
  data: CareerData
  compact?: boolean
  onAdd: (type: Extract<RecordType, 'task' | 'event'>, date: Date) => void
  onOpen: (type: Extract<RecordType, 'task' | 'event'>, id: string) => void
  onDeleteEvent?: (id: string) => void
}

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function MonthlyCalendar({ data, compact = false, onAdd, onOpen, onDeleteEvent }: MonthlyCalendarProps) {
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const days = useMemo(() => getCalendarDays(month), [month])
  const items = useMemo(() => getScheduledItems(data), [data])
  const selectedItems = getItemsForDate(items, selectedDate)

  const goToMonth = (nextMonth: Date) => {
    setMonth(startOfMonth(nextMonth))
    setSelectedDate((selected) => isSameMonth(selected, nextMonth) ? selected : startOfMonth(nextMonth))
  }

  const selectToday = () => {
    const today = new Date()
    setMonth(startOfMonth(today))
    setSelectedDate(today)
  }

  return <section className={`monthly-calendar ${compact ? 'monthly-calendar-compact' : ''}`} aria-label="Monthly calendar">
    <div className="calendar-heading">
      <div><h2>{format(month, 'MMMM yyyy')}</h2><p>{selectedItems.length ? `${selectedItems.length} scheduled item${selectedItems.length === 1 ? '' : 's'} selected` : 'Select a date to see what’s planned'}</p></div>
      <div className="calendar-controls">
        <button className="calendar-today" onClick={selectToday}>Today</button>
        <button className="calendar-nav-button" aria-label="Previous month" onClick={() => goToMonth(subMonths(month, 1))}><ArrowLeft size={15} /></button>
        <button className="calendar-nav-button" aria-label="Next month" onClick={() => goToMonth(addMonths(month, 1))}><ArrowRight size={15} /></button>
      </div>
    </div>
    <div className="calendar-grid" role="grid" aria-label={format(month, 'MMMM yyyy')}>
      {weekdays.map((weekday) => <div className="calendar-weekday" role="columnheader" key={weekday}>{weekday}</div>)}
      {days.map((day) => {
        const dayItems = getItemsForDate(items, day)
        const hasEvent = dayItems.some((item) => item.type === 'event')
        const hasTask = dayItems.some((item) => item.type === 'task')
        const selected = isSameDay(day, selectedDate)
        return <button
          className={`calendar-day ${!isSameMonth(day, month) ? 'calendar-day-outside' : ''} ${isToday(day) ? 'calendar-day-today' : ''} ${selected ? 'calendar-day-selected' : ''}`}
          role="gridcell"
          aria-label={`${format(day, 'EEEE, MMMM d, yyyy')}${dayItems.length ? `, ${dayItems.length} scheduled item${dayItems.length === 1 ? '' : 's'}` : ''}`}
          aria-pressed={selected}
          key={format(day, 'yyyy-MM-dd')}
          onClick={() => setSelectedDate(day)}
        >
          <span className="calendar-day-number">{format(day, 'd')}</span>
          <span className="calendar-indicators" aria-hidden="true">
            {hasEvent && <i className="calendar-event-indicator" />}
            {hasTask && <i className="calendar-task-indicator" />}
          </span>
        </button>
      })}
    </div>
    <div className="calendar-selected">
      <div className="calendar-selected-heading">
        <h3>{isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE, MMM d')}</h3>
        <div className="calendar-add-actions">
          <button className="calendar-add-link" onClick={() => onAdd('event', selectedDate)}><CalendarPlus size={13} /> Event</button>
          <button className="calendar-add-link" onClick={() => onAdd('task', selectedDate)}><Plus size={13} /> Task</button>
        </div>
      </div>
      {selectedItems.length ? <div className="calendar-selected-list">
        {selectedItems.map((item) => <article className={`calendar-selected-item calendar-selected-${item.type}`} key={`${item.type}-${item.id}`}>
          <span className="calendar-item-symbol" aria-hidden="true">{item.type === 'event' ? <Clock3 size={13} /> : <CheckSquare size={13} />}</span>
          <button className="calendar-item-open" onClick={() => onOpen(item.type, item.id)}>
            <strong>{item.title}</strong>
            <span>{item.type === 'event' ? `${item.category}${item.time ? ` · ${format(parseISO(item.time), 'h:mm a')}` : ''}` : `${item.category}${item.company ? ` · ${item.company}` : ''}`}</span>
            {item.type === 'event' && (item.location || item.company) && <small><MapPin size={11} /> {item.location || item.company}</small>}
          </button>
          {item.type === 'event' && onDeleteEvent && <button className="calendar-item-delete" aria-label={`Delete ${item.title}`} onClick={() => onDeleteEvent(item.id)}><Trash2 size={13} /></button>}
        </article>)}
      </div> : <div className="calendar-empty">Nothing scheduled. Add an event or task for this date.</div>}
      <p className="calendar-legend"><span><i className="calendar-event-indicator" /> Events</span><span><i className="calendar-task-indicator" /> Tasks</span></p>
    </div>
  </section>
}
