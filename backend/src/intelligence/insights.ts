import type { PrismaClient } from '@prisma/client'
import type { SmartInsightsSummary, SmartReminderItem } from './types.js'

export async function generateSmartInsights(
  prisma: PrismaClient,
  userId: string
): Promise<SmartInsightsSummary> {
  const now = new Date()
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

  // 1. Fetch user's applications
  const applications = await prisma.jobApplication.findMany({
    where: { userId },
    include: {
      company: { select: { id: true, name: true } },
      events: { where: { startsAt: { gte: now } } },
      tasks: true,
    },
    orderBy: { updatedAt: 'desc' },
  })

  // 2. Fetch user's tasks
  const tasks = await prisma.task.findMany({
    where: { userId },
    include: {
      company: { select: { id: true, name: true } },
      application: { select: { id: true, jobTitle: true } },
    },
    orderBy: { dueAt: 'asc' },
  })

  // 3. Fetch user's upcoming events
  const events = await prisma.event.findMany({
    where: {
      userId,
      startsAt: { gte: now, lte: sevenDaysFromNow },
    },
    include: {
      company: { select: { id: true, name: true } },
      application: { select: { id: true, jobTitle: true } },
    },
    orderBy: { startsAt: 'asc' },
  })

  // 4. Fetch user's contacts needing follow-up
  const contacts = await prisma.contact.findMany({
    where: {
      userId,
      nextFollowUpAt: { lte: threeDaysFromNow },
    },
    include: {
      company: { select: { id: true, name: true } },
    },
  })

  const reminders: SmartReminderItem[] = []

  // Reminder Rule 1: Upcoming Interviews
  for (const event of events) {
    if (event.eventType === 'INTERVIEW') {
      const companyName = event.company?.name || 'Company'
      const role = event.application?.jobTitle || 'Role'
      reminders.push({
        id: `event-${event.id}`,
        type: 'interview',
        title: `Interview with ${companyName}`,
        description: `Scheduled for ${event.startsAt.toLocaleDateString()} for ${role}.`,
        severity: 'urgent',
        date: event.startsAt.toISOString(),
        recordId: event.id,
        recordType: 'event',
        actionUrl: `/calendar`,
        actionLabel: 'View Schedule',
        reason: 'Interview is scheduled within the next 7 days.',
      })
    }
  }

  // Reminder Rule 2: Overdue Tasks
  for (const task of tasks) {
    if (task.status !== 'COMPLETED' && task.dueAt && task.dueAt < now) {
      reminders.push({
        id: `task-overdue-${task.id}`,
        type: 'overdue_task',
        title: `Overdue Task: ${task.title}`,
        description: `Due on ${task.dueAt.toLocaleDateString()}.${task.company ? ` Related to ${task.company.name}.` : ''}`,
        severity: 'urgent',
        date: task.dueAt.toISOString(),
        recordId: task.id,
        recordType: 'task',
        actionUrl: `/tasks`,
        actionLabel: 'Review Tasks',
        reason: 'Task deadline has passed.',
      })
    }
  }

  // Reminder Rule 3: Pending Contact Follow-ups
  for (const contact of contacts) {
    if (contact.nextFollowUpAt) {
      const isPast = contact.nextFollowUpAt < now
      reminders.push({
        id: `contact-fu-${contact.id}`,
        type: 'follow_up',
        title: `Follow up with ${contact.name}`,
        description: `${contact.jobTitle ? `${contact.jobTitle} ` : ''}${contact.company ? `at ${contact.company.name}` : ''}. Follow-up ${isPast ? 'was due' : 'due'} on ${contact.nextFollowUpAt.toLocaleDateString()}.`,
        severity: isPast ? 'warning' : 'info',
        date: contact.nextFollowUpAt.toISOString(),
        recordId: contact.id,
        recordType: 'company',
        actionUrl: `/contacts`,
        actionLabel: 'Open Contacts',
        reason: 'Scheduled networking follow-up date reached.',
      })
    }
  }

  // Reminder Rule 4: Applications without updates (> 10 days since applied, no interviews)
  for (const app of applications) {
    if (app.status === 'APPLIED' && app.appliedAt) {
      const daysSinceApplied = Math.floor((now.getTime() - app.appliedAt.getTime()) / (1000 * 60 * 60 * 24))
      if (daysSinceApplied >= 10 && app.events.length === 0) {
        reminders.push({
          id: `app-stale-${app.id}`,
          type: 'stale_application',
          title: `Check in on ${app.jobTitle}`,
          description: `Applied ${daysSinceApplied} days ago${app.company ? ` to ${app.company.name}` : ''} with no recent activity recorded.`,
          severity: 'info',
          recordId: app.id,
          recordType: 'application',
          actionUrl: `/applications`,
          actionLabel: 'View Application',
          reason: 'More than 10 days have elapsed since submission without follow-up.',
        })
      }
    }
  }

  // Reminder Rule 5: Preparation tasks due soon
  const prepCategories = ['Technical Prep', 'System Design', 'DSA Practice', 'Behavioral Prep']
  for (const task of tasks) {
    if (
      task.status !== 'COMPLETED' &&
      task.dueAt &&
      task.dueAt >= now &&
      task.dueAt <= threeDaysFromNow &&
      task.category &&
      prepCategories.includes(task.category)
    ) {
      reminders.push({
        id: `task-prep-${task.id}`,
        type: 'preparation_due',
        title: `Interview Prep: ${task.title}`,
        description: `Due in ${Math.ceil((task.dueAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} days.`,
        severity: 'warning',
        date: task.dueAt.toISOString(),
        recordId: task.id,
        recordType: 'task',
        actionUrl: `/tasks`,
        actionLabel: 'Practice Now',
        reason: 'Target interview preparation task deadline is approaching.',
      })
    }
  }

  // Aggregate Stats
  const activeApplications = applications.filter((a) => !['REJECTED', 'OFFER'].includes(a.status)).length

  const applicationsByStatus: Record<string, number> = {}
  for (const a of applications) {
    applicationsByStatus[a.status] = (applicationsByStatus[a.status] || 0) + 1
  }

  const prepTasks = tasks.filter((t) => t.category && prepCategories.includes(t.category))
  const completedPrepTasks = prepTasks.filter((t) => t.status === 'COMPLETED')
  const preparationProgressPercentage =
    prepTasks.length > 0 ? Math.round((completedPrepTasks.length / prepTasks.length) * 100) : 100

  // Suggested actions prioritizes urgent items first
  const suggestedActions = [...reminders].sort((a, b) => {
    const priorityMap: Record<string, number> = { urgent: 3, warning: 2, info: 1 }
    const pB = priorityMap[b.severity] ?? 0
    const pA = priorityMap[a.severity] ?? 0
    return pB - pA
  })

  return {
    reminders,
    stats: {
      activeApplications,
      applicationsByStatus,
      upcomingInterviewsCount: events.filter((e) => e.eventType === 'INTERVIEW').length,
      pendingFollowUpsCount: contacts.length,
      overdueTasksCount: reminders.filter((r) => r.type === 'overdue_task').length,
      preparationProgressPercentage,
    },
    suggestedActions: suggestedActions.slice(0, 6),
  }
}
