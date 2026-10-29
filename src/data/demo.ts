import type { Activity, Application, CareerData, CareerEvent, Company, Contact, FollowUpTask } from '../types'

const dateOffset = (days: number, hour = 10) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

const companies: Company[] = [
  { id: 'co-1', name: 'Northstar', industry: 'Technology', location: 'San Francisco, CA', website: 'https://northstar.example', size: '1,000–5,000', tags: ['Growth stage'], careersUrl: 'https://northstar.example/careers', linkedinUrl: 'https://linkedin.com/company/northstar', notes: '', createdAt: dateOffset(-45) },
  { id: 'co-2', name: 'Meridian Health', industry: 'Healthcare', location: 'New York, NY', website: 'https://meridian.example', size: '500–1,000', tags: ['Mission-driven'], careersUrl: 'https://meridian.example/careers', linkedinUrl: 'https://linkedin.com/company/meridian-health', notes: '', createdAt: dateOffset(-39) },
  { id: 'co-3', name: 'Fable Studio', industry: 'Design', location: 'Remote', website: 'https://fable.example', size: '50–200', tags: ['Remote'], careersUrl: 'https://fable.example/careers', linkedinUrl: 'https://linkedin.com/company/fable-studio', notes: '', createdAt: dateOffset(-32) },
  { id: 'co-4', name: 'Juniper Labs', industry: 'Technology', location: 'Seattle, WA', website: 'https://juniper.example', size: '200–500', tags: ['Product-led'], careersUrl: 'https://juniper.example/careers', linkedinUrl: 'https://linkedin.com/company/juniper-labs', notes: '', createdAt: dateOffset(-28) },
  { id: 'co-5', name: 'Atlas Finance', industry: 'Finance', location: 'Chicago, IL', website: 'https://atlas.example', size: '1,000–5,000', tags: ['Fintech'], careersUrl: 'https://atlas.example/careers', linkedinUrl: 'https://linkedin.com/company/atlas-finance', notes: '', createdAt: dateOffset(-20) },
  { id: 'co-6', name: 'Common Ground', industry: 'Education', location: 'Boston, MA', website: 'https://commonground.example', size: '200–500', tags: ['Impact'], careersUrl: 'https://commonground.example/careers', linkedinUrl: 'https://linkedin.com/company/common-ground', notes: '', createdAt: dateOffset(-16) },
  { id: 'co-7', name: 'Brightside', industry: 'Technology', location: 'Austin, TX', website: 'https://brightside.example', size: '50–200', tags: ['Early stage'], careersUrl: 'https://brightside.example/careers', linkedinUrl: 'https://linkedin.com/company/brightside', notes: '', createdAt: dateOffset(-9) },
]

const applicationSeeds: Omit<Application, 'prepNotes'>[] = [
  { id: 'app-1', companyId: 'co-1', jobTitle: 'Senior Product Designer', status: 'Interview', appliedAt: dateOffset(-18), nextAction: 'Portfolio conversation', nextFollowUpAt: dateOffset(1, 14), location: 'San Francisco, CA', jobDescription: '', jobUrl: '', applicationUrl: '', jobType: 'Full-time', workArrangement: 'Hybrid', resumeReference: 'Product design v3', notes: '' },
  { id: 'app-2', companyId: 'co-2', jobTitle: 'Product Designer', status: 'Assessment', appliedAt: dateOffset(-16), nextAction: 'Submit design exercise', nextFollowUpAt: dateOffset(2), location: 'New York, NY', jobDescription: '', jobUrl: '', applicationUrl: '', jobType: 'Full-time', workArrangement: 'Hybrid', resumeReference: 'Product design v3', notes: '' },
  { id: 'app-3', companyId: 'co-3', jobTitle: 'Design Systems Lead', status: 'Applied', appliedAt: dateOffset(-13), nextAction: 'Follow up with recruiter', nextFollowUpAt: dateOffset(3), location: 'Remote', jobDescription: '', jobUrl: '', applicationUrl: '', jobType: 'Full-time', workArrangement: 'Remote', resumeReference: 'Product design v3', notes: '' },
  { id: 'app-4', companyId: 'co-4', jobTitle: 'Product Designer', status: 'Interview', appliedAt: dateOffset(-11), nextAction: 'Hiring manager interview', nextFollowUpAt: dateOffset(3, 11), location: 'Seattle, WA', jobDescription: '', jobUrl: '', applicationUrl: '', jobType: 'Full-time', workArrangement: 'On-site', resumeReference: 'Product design v3', notes: '' },
  { id: 'app-5', companyId: 'co-5', jobTitle: 'UX Designer', status: 'Saved', appliedAt: dateOffset(-8), nextAction: 'Tailor portfolio', nextFollowUpAt: dateOffset(4), location: 'Chicago, IL', jobDescription: '', jobUrl: '', applicationUrl: '', jobType: 'Full-time', workArrangement: 'Hybrid', resumeReference: 'UX case studies', notes: '' },
  { id: 'app-6', companyId: 'co-6', jobTitle: 'Senior UX Researcher', status: 'Applied', appliedAt: dateOffset(-7), nextAction: 'Check application status', nextFollowUpAt: dateOffset(5), location: 'Boston, MA', jobDescription: '', jobUrl: '', applicationUrl: '', jobType: 'Full-time', workArrangement: 'Hybrid', resumeReference: 'Research resume', notes: '' },
  { id: 'app-7', companyId: 'co-7', jobTitle: 'Product Design Lead', status: 'Offer', appliedAt: dateOffset(-20), nextAction: 'Review offer details', nextFollowUpAt: dateOffset(1), location: 'Austin, TX', jobDescription: '', jobUrl: '', applicationUrl: '', jobType: 'Full-time', workArrangement: 'Remote', resumeReference: 'Product design v3', notes: '' },
  { id: 'app-8', companyId: 'co-1', jobTitle: 'Design Manager', status: 'Rejected', appliedAt: dateOffset(-30), nextAction: '', nextFollowUpAt: '', location: 'San Francisco, CA', jobDescription: '', jobUrl: '', applicationUrl: '', jobType: 'Full-time', workArrangement: 'Hybrid', resumeReference: 'Design manager resume', notes: '' },
  { id: 'app-9', companyId: 'co-4', jobTitle: 'Staff Product Designer', status: 'Applied', appliedAt: dateOffset(-4), nextAction: 'Send a thoughtful follow-up', nextFollowUpAt: dateOffset(6), location: 'Remote', jobDescription: '', jobUrl: '', applicationUrl: '', jobType: 'Full-time', workArrangement: 'Remote', resumeReference: 'Product design v3', notes: '' },
  { id: 'app-10', companyId: 'co-5', jobTitle: 'Product Designer, Growth', status: 'Saved', appliedAt: dateOffset(-2), nextAction: 'Research the team', nextFollowUpAt: dateOffset(7), location: 'Chicago, IL', jobDescription: '', jobUrl: '', applicationUrl: '', jobType: 'Full-time', workArrangement: 'Hybrid', resumeReference: 'Growth designer resume', notes: '' },
  { id: 'app-11', companyId: 'co-2', jobTitle: 'Design Operations Lead', status: 'Applied', appliedAt: dateOffset(-1), nextAction: 'Connect with the team', nextFollowUpAt: dateOffset(8), location: 'Remote', jobDescription: '', jobUrl: '', applicationUrl: '', jobType: 'Full-time', workArrangement: 'Remote', resumeReference: 'Product design v3', notes: '' },
]
const applications: Application[] = applicationSeeds.map((application) => ({ ...application, prepNotes: '' }))

const contacts: Contact[] = [
  { id: 'ct-1', companyId: 'co-1', name: 'Maya Chen', jobTitle: 'Talent Partner', status: 'Connected', lastContactedAt: dateOffset(-2), tags: ['Recruiter', 'Design'], linkedinUrl: '', email: '', phone: '', connectionRequestedAt: dateOffset(-8), connectionAcceptedAt: dateOffset(-6), nextFollowUpAt: dateOffset(3), notes: '' },
  { id: 'ct-2', companyId: 'co-2', name: 'Jordan Ellis', jobTitle: 'Design Director', status: 'Connected', lastContactedAt: dateOffset(-4), tags: ['Hiring manager'], linkedinUrl: '', email: '', phone: '', connectionRequestedAt: dateOffset(-18), connectionAcceptedAt: dateOffset(-16), nextFollowUpAt: '', notes: '' },
  { id: 'ct-3', companyId: 'co-3', name: 'Sam Rivera', jobTitle: 'Staff Designer', status: 'Requested', lastContactedAt: dateOffset(-6), tags: ['Designer'], linkedinUrl: '', email: '', phone: '', connectionRequestedAt: dateOffset(-6), connectionAcceptedAt: '', nextFollowUpAt: dateOffset(2), notes: '' },
  { id: 'ct-4', companyId: 'co-4', name: 'Ari Patel', jobTitle: 'Product Design Lead', status: 'Connected', lastContactedAt: dateOffset(-1), tags: ['Referral'], linkedinUrl: '', email: '', phone: '', connectionRequestedAt: dateOffset(-5), connectionAcceptedAt: dateOffset(-4), nextFollowUpAt: '', notes: '' },
  { id: 'ct-5', companyId: 'co-5', name: 'Taylor Brooks', jobTitle: 'Senior Recruiter', status: 'Connected', lastContactedAt: dateOffset(-8), tags: ['Recruiter'], linkedinUrl: '', email: '', phone: '', connectionRequestedAt: dateOffset(-15), connectionAcceptedAt: dateOffset(-12), nextFollowUpAt: '', notes: '' },
  { id: 'ct-6', companyId: 'co-6', name: 'Alex Morgan', jobTitle: 'UX Researcher', status: 'Requested', lastContactedAt: dateOffset(-10), tags: ['Alumni'], linkedinUrl: '', email: '', phone: '', connectionRequestedAt: dateOffset(-10), connectionAcceptedAt: '', nextFollowUpAt: dateOffset(4), notes: '' },
  { id: 'ct-7', companyId: 'co-7', name: 'Jamie Kim', jobTitle: 'Head of Product', status: 'Connected', lastContactedAt: dateOffset(-3), tags: ['Hiring manager'], linkedinUrl: '', email: '', phone: '', connectionRequestedAt: dateOffset(-8), connectionAcceptedAt: dateOffset(-7), nextFollowUpAt: '', notes: '' },
  { id: 'ct-8', companyId: 'co-1', name: 'Riley Johnson', jobTitle: 'Product Designer', status: 'Connected', lastContactedAt: dateOffset(-12), tags: ['Designer', 'Referral'], linkedinUrl: '', email: '', phone: '', connectionRequestedAt: dateOffset(-28), connectionAcceptedAt: dateOffset(-26), nextFollowUpAt: '', notes: '' },
  { id: 'ct-9', companyId: 'co-3', name: 'Drew Wallace', jobTitle: 'People Partner', status: 'Requested', lastContactedAt: dateOffset(-15), tags: ['HR'], linkedinUrl: '', email: '', phone: '', connectionRequestedAt: dateOffset(-15), connectionAcceptedAt: '', nextFollowUpAt: dateOffset(5), notes: '' },
]

const tasks: FollowUpTask[] = [
  { id: 'task-1', title: 'Prepare for portfolio conversation', companyId: 'co-1', dueAt: dateOffset(1), priority: 'High', done: false, description: '', contactId: 'ct-1', applicationId: 'app-1', category: 'Interview prep' },
  { id: 'task-2', title: 'Submit design exercise', companyId: 'co-2', dueAt: dateOffset(2), priority: 'High', done: false, description: '', contactId: '', applicationId: 'app-2', category: 'Assessment' },
  { id: 'task-3', title: 'Send a thank-you to Ari', companyId: 'co-4', dueAt: dateOffset(0), priority: 'Medium', done: false, description: '', contactId: 'ct-4', applicationId: '', category: 'Follow-up' },
  { id: 'task-4', title: 'Research the Atlas team', companyId: 'co-5', dueAt: dateOffset(-1), priority: 'Low', done: false, description: '', contactId: '', applicationId: 'app-5', category: 'Research' },
  { id: 'task-5', title: 'Follow up with Maya', companyId: 'co-1', dueAt: dateOffset(3), priority: 'Medium', done: false, description: '', contactId: 'ct-1', applicationId: '', category: 'Follow-up' },
  { id: 'task-6', title: 'Review offer details', companyId: 'co-7', dueAt: dateOffset(1), priority: 'High', done: false, description: '', contactId: '', applicationId: 'app-7', category: 'Offer' },
  { id: 'task-7', title: 'Update portfolio case study', companyId: 'co-3', dueAt: dateOffset(-2), priority: 'Low', done: true, description: '', contactId: '', applicationId: '', category: 'Portfolio' },
]

const events: CareerEvent[] = [
  { id: 'ev-1', title: 'Portfolio conversation', eventType: 'Interview', companyId: 'co-1', startsAt: dateOffset(1, 14), location: 'Google Meet', endsAt: '', meetingUrl: '', notes: '', contactId: 'ct-1', applicationId: 'app-1' },
  { id: 'ev-2', title: 'Design exercise review', eventType: 'Assessment', companyId: 'co-2', startsAt: dateOffset(2, 11), location: 'Remote', endsAt: '', meetingUrl: '', notes: '', contactId: '', applicationId: 'app-2' },
  { id: 'ev-3', title: 'Hiring manager interview', eventType: 'Interview', companyId: 'co-4', startsAt: dateOffset(3, 10), location: 'Juniper HQ', endsAt: '', meetingUrl: '', notes: '', contactId: 'ct-4', applicationId: 'app-4' },
  { id: 'ev-4', title: 'Design community coffee chat', eventType: 'Networking', companyId: 'co-3', startsAt: dateOffset(5, 9), location: 'Remote', endsAt: '', meetingUrl: '', notes: '', contactId: 'ct-3', applicationId: '' },
]

const activities: Activity[] = [
  { id: 'act-1', type: 'INTERVIEW_SCHEDULED', description: 'Interview scheduled for Product Designer', occurredAt: dateOffset(-1), companyId: 'co-4', contactId: '', applicationId: 'app-4' },
  { id: 'act-2', type: 'CONTACT_CONNECTED', description: 'Connected with Maya Chen', occurredAt: dateOffset(-2), companyId: 'co-1', contactId: 'ct-1', applicationId: '' },
  { id: 'act-3', type: 'APPLICATION_STATUS_CHANGED', description: 'Application moved to assessment', occurredAt: dateOffset(-3), companyId: 'co-2', contactId: '', applicationId: 'app-2' },
  { id: 'act-4', type: 'REFERRAL_CONVERSATION', description: 'Referral conversation with Ari Patel', occurredAt: dateOffset(-4), companyId: 'co-4', contactId: 'ct-4', applicationId: '' },
]

export const demoData: CareerData = { companies, applications, contacts, tasks, events, activities }

export const getCompanyName = (data: CareerData, companyId: string) =>
  data.companies.find((company) => company.id === companyId)?.name ?? 'Independent'

export const recordCollections = {
  companies: (data: CareerData) => data.companies,
  applications: (data: CareerData) => data.applications,
  contacts: (data: CareerData) => data.contacts,
  tasks: (data: CareerData) => data.tasks,
  events: (data: CareerData) => data.events,
} satisfies Record<string, (data: CareerData) => Array<Company | Application | Contact | FollowUpTask | CareerEvent>>
