import type { CareerData, RecordType } from '../types'

export function deleteCareerRecord(data: CareerData, type: RecordType, id: string): CareerData {
  if (type === 'company') return {
    ...data,
    companies: data.companies.filter((item) => item.id !== id),
    applications: data.applications.map((item) => item.companyId === id ? { ...item, companyId: '' } : item),
    contacts: data.contacts.map((item) => item.companyId === id ? { ...item, companyId: '' } : item),
    tasks: data.tasks.map((item) => item.companyId === id ? { ...item, companyId: '' } : item),
    events: data.events.map((item) => item.companyId === id ? { ...item, companyId: '' } : item),
    activities: data.activities.map((item) => item.companyId === id ? { ...item, companyId: '' } : item),
  }
  if (type === 'application') return {
    ...data,
    applications: data.applications.filter((item) => item.id !== id),
    tasks: data.tasks.map((item) => item.applicationId === id ? { ...item, applicationId: '' } : item),
    events: data.events.map((item) => item.applicationId === id ? { ...item, applicationId: '' } : item),
    activities: data.activities.map((item) => item.applicationId === id ? { ...item, applicationId: '' } : item),
  }
  if (type === 'contact') return {
    ...data,
    contacts: data.contacts.filter((item) => item.id !== id),
    tasks: data.tasks.map((item) => item.contactId === id ? { ...item, contactId: '' } : item),
    events: data.events.map((item) => item.contactId === id ? { ...item, contactId: '' } : item),
    activities: data.activities.map((item) => item.contactId === id ? { ...item, contactId: '' } : item),
  }
  if (type === 'task') return { ...data, tasks: data.tasks.filter((item) => item.id !== id) }
  return { ...data, events: data.events.filter((item) => item.id !== id) }
}
