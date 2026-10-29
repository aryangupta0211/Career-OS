export type ApplicationStatus = 'Saved' | 'Applied' | 'Assessment' | 'Interview' | 'Offer' | 'Rejected'
export type TaskPriority = 'Low' | 'Medium' | 'High'

export interface Company {
  id: string
  name: string
  industry: string
  location: string
  website: string
  size: string
  tags: string[]
  careersUrl: string
  linkedinUrl: string
  notes: string
  createdAt: string
}

export interface Application {
  id: string
  companyId: string
  jobTitle: string
  status: ApplicationStatus
  appliedAt: string
  nextAction: string
  nextFollowUpAt: string
  location: string
  jobDescription: string
  prepNotes: string
  jobUrl: string
  applicationUrl: string
  jobType: string
  workArrangement: string
  resumeReference: string
  notes: string
}

export interface Contact {
  id: string
  companyId: string
  name: string
  jobTitle: string
  status: string
  lastContactedAt: string
  tags: string[]
  linkedinUrl: string
  email: string
  phone: string
  connectionRequestedAt: string
  connectionAcceptedAt: string
  nextFollowUpAt: string
  notes: string
}

export interface FollowUpTask {
  id: string
  title: string
  companyId: string
  dueAt: string
  priority: TaskPriority
  done: boolean
  description: string
  contactId: string
  applicationId: string
  category: string
}

export interface CareerEvent {
  id: string
  title: string
  eventType: string
  companyId: string
  startsAt: string
  location: string
  endsAt: string
  meetingUrl: string
  notes: string
  contactId: string
  applicationId: string
}

export interface Activity {
  id: string
  type: string
  description: string
  occurredAt: string
  companyId: string
  contactId: string
  applicationId: string
}

export interface CareerData {
  companies: Company[]
  applications: Application[]
  contacts: Contact[]
  tasks: FollowUpTask[]
  events: CareerEvent[]
  activities: Activity[]
}

export type RecordType = 'company' | 'application' | 'contact' | 'task' | 'event'
export interface AppShellContext {
  openAdd: (type: RecordType, initialDate?: Date) => void
}
