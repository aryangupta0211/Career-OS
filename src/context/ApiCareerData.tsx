import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { z } from 'zod'
import { useAuth } from './auth-context'
import { CareerDataContext, type CareerDataContextValue } from './careerDataContext'
import type { CareerData, RecordType } from '../types'

const emptyData: CareerData = {
  companies: [], applications: [], contacts: [], tasks: [], events: [], activities: [],
}
const strings = z.array(z.string())
const apiDataSchema = z.object({
  companies: z.array(z.object({
    id: z.string(), name: z.string(), industry: z.string(), location: z.string(), website: z.string(),
    size: z.string(), tags: strings, careersUrl: z.string(), linkedinUrl: z.string(), notes: z.string(), createdAt: z.string(),
  })),
  applications: z.array(z.object({
    id: z.string(), companyId: z.string(), jobTitle: z.string(),
    status: z.enum(['Saved', 'Applied', 'Assessment', 'Interview', 'Offer', 'Rejected']),
    appliedAt: z.string(), nextAction: z.string(), nextFollowUpAt: z.string(), location: z.string(),
    jobDescription: z.string(), prepNotes: z.string(), jobUrl: z.string(), applicationUrl: z.string(),
    jobType: z.string(), workArrangement: z.string(), resumeReference: z.string(), notes: z.string(),
  })),
  contacts: z.array(z.object({
    id: z.string(), companyId: z.string(), name: z.string(), jobTitle: z.string(),
    status: z.string(), lastContactedAt: z.string(), tags: strings, linkedinUrl: z.string(),
    email: z.string(), phone: z.string(), connectionRequestedAt: z.string(),
    connectionAcceptedAt: z.string(), nextFollowUpAt: z.string(), notes: z.string(),
  })),
  tasks: z.array(z.object({
    id: z.string(), title: z.string(), companyId: z.string(), dueAt: z.string(),
    priority: z.enum(['Low', 'Medium', 'High']), done: z.boolean(), description: z.string(),
    contactId: z.string(), applicationId: z.string(), category: z.string(),
  })),
  events: z.array(z.object({
    id: z.string(), title: z.string(), eventType: z.string(), companyId: z.string(),
    startsAt: z.string(), location: z.string(), endsAt: z.string(), meetingUrl: z.string(),
    notes: z.string(), contactId: z.string(), applicationId: z.string(),
  })),
  activities: z.array(z.object({
    id: z.string(), type: z.string(), description: z.string(), occurredAt: z.string(),
    companyId: z.string(), contactId: z.string(), applicationId: z.string(),
  })),
})

class ApiResponseError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiResponseError'
    this.status = status
  }
}

async function responseError(response: Response) {
  let message = `The server request failed (${response.status}).`
  try {
    const body: unknown = await response.json()
    if (typeof body === 'object' && body !== null && 'error' in body
      && typeof body.error === 'object' && body.error !== null
      && 'message' in body.error && typeof body.error.message === 'string') {
      message = body.error.message
    } else if (typeof body === 'object' && body !== null
      && 'error' in body && typeof body.error === 'string') {
      message = body.error
    }
  } catch {
    message = `The server request failed (${response.status}) with an unreadable error response.`
  }
  return new ApiResponseError(message, response.status)
}

function requestFailureMessage(error: unknown, operation: 'load' | 'save') {
  if (error instanceof TypeError) {
    return operation === 'save'
      ? 'CareerOS could not confirm whether your changes were saved. Refresh the workspace before resubmitting.'
      : 'CareerOS could not reach the API. Check that the backend is running, then try again.'
  }
  if (error instanceof Error) return error.message
  return operation === 'load'
    ? 'CareerOS could not load your workspace data. Try again.'
    : 'CareerOS could not save your workspace changes. Try again.'
}

async function loadCareerData(token: string): Promise<CareerData> {
  const response = await fetch('/api/data', { headers: { Authorization: `Bearer ${token}` } })
  if (!response.ok) throw await responseError(response)
  const payload: unknown = await response.json()
  const parsed = apiDataSchema.safeParse(payload)
  if (!parsed.success) throw new Error('The server returned data in an unsupported format.')
  return parsed.data
}

function requestBody(type: RecordType, fields: Record<string, string>, extra?: Record<string, boolean>) {
  const output: Record<string, string | boolean> = { ...fields, ...extra }
  if (type === 'event') {
    for (const field of ['startsAt', 'endsAt']) {
      const value = fields[field]
      if (value) {
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) throw new RangeError(`Cannot save an invalid ${field} value.`)
        output[field] = date.toISOString()
      }
    }
  }
  return output
}

export function ApiCareerDataProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const [data, setData] = useState<CareerData>(emptyData)
  const [loadedToken, setLoadedToken] = useState<string | null>(null)
  const [loadRequest, setLoadRequest] = useState(0)
  const [completedLoadRequest, setCompletedLoadRequest] = useState<number | null>(null)
  const [mutationCount, setMutationCount] = useState(0)
  const [dataErrorState, setDataErrorState] = useState<{
    token: string
    message: string
    retry: 'load' | 'mutation' | 'refresh'
  } | null>(null)
  const generation = useRef(0)
  const latestDataRequest = useRef(0)
  const failedMutation = useRef<{ token: string; path: string; method: 'POST' | 'PATCH' | 'DELETE'; body?: Record<string, string | boolean> } | null>(null)
  const token = auth.user ? auth.session?.access_token : undefined
  const dataLoading = Boolean(token && (loadedToken !== token || completedLoadRequest !== loadRequest)) || mutationCount > 0
  const visibleData = token && loadedToken === token ? data : emptyData
  const dataError = token && dataErrorState?.token === token ? dataErrorState.message : ''
  const dataRetryLabel: CareerDataContextValue['dataRetryLabel'] = token && dataErrorState?.token === token
    ? dataErrorState.retry === 'mutation' ? 'Retry request' : dataErrorState.retry === 'refresh' ? 'Refresh workspace' : 'Try again'
    : 'Try again'

  const reload = useCallback(async (accessToken: string, version: number) => {
    const requestId = ++latestDataRequest.current
    let currentData: CareerData
    try {
      currentData = await loadCareerData(accessToken)
    } catch (error) {
      if (version === generation.current && requestId === latestDataRequest.current) throw error
      return
    }
    if (version === generation.current && requestId === latestDataRequest.current) {
      setData(currentData)
      setLoadedToken(accessToken)
      setDataErrorState(null)
    }
  }, [])

  useEffect(() => {
    const version = ++generation.current
    const request = loadRequest
    if (!token) return
    void reload(token, version)
      .then(() => {
        if (version === generation.current) setCompletedLoadRequest(request)
      })
      .catch((error: unknown) => {
        if (version === generation.current) {
          setData(emptyData)
          setDataErrorState({
            token,
            message: requestFailureMessage(error, 'load'),
            retry: 'load',
          })
          setLoadedToken(token)
          setCompletedLoadRequest(request)
        }
      })
    return () => { generation.current += 1 }
  }, [loadRequest, reload, token])

  const mutate = useCallback((path: string, method: 'POST' | 'PATCH' | 'DELETE', body?: Record<string, string | boolean>) => {
    if (!token) {
      setDataErrorState({ token: '', message: 'Your session is no longer available. Sign in again to continue.', retry: 'refresh' })
      return
    }
    const version = generation.current
    setMutationCount((count) => count + 1)
    void (async () => {
      const response = await fetch(path, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
      if (!response.ok) throw await responseError(response)
      failedMutation.current = null
      await reload(token, version)
    })().catch((error: unknown) => {
      if (version === generation.current) {
        failedMutation.current = error instanceof ApiResponseError && error.status < 500
          ? { token, path, method, body }
          : null
        setDataErrorState({
          token,
          message: requestFailureMessage(error, 'save'),
          retry: error instanceof ApiResponseError && error.status < 500 ? 'mutation' : 'refresh',
        })
      }
    }).finally(() => {
      setMutationCount((count) => Math.max(0, count - 1))
    })
  }, [reload, token])

  const value = useMemo(() => ({
    data: visibleData,
    dataLoading,
    dataError,
    dataRetryLabel,
    addRecord: (type: RecordType, fields: Record<string, string>) => {
      try {
        mutate(`/api/data/${type}`, 'POST', requestBody(type, fields))
      } catch (error) {
        setDataErrorState({ token: token ?? '', message: error instanceof Error ? error.message : 'Could not save this record.', retry: 'refresh' })
      }
    },
    updateRecord: (type: RecordType, id: string, fields: Record<string, string>) => {
      try {
        mutate(`/api/data/${type}/${encodeURIComponent(id)}`, 'PATCH', requestBody(type, fields))
      } catch (error) {
        setDataErrorState({ token: token ?? '', message: error instanceof Error ? error.message : 'Could not save this record.', retry: 'refresh' })
      }
    },
    deleteRecord: (type: RecordType, id: string) => mutate(`/api/data/${type}/${encodeURIComponent(id)}`, 'DELETE'),
    retryDataLoad: () => {
      const failed = failedMutation.current
      if (failed && failed.token === token) {
        failedMutation.current = null
        setDataErrorState(null)
        mutate(failed.path, failed.method, failed.body)
        return
      }
      setDataErrorState(null)
      setLoadRequest((request) => request + 1)
    },
    toggleTask: (id: string) => {
      const task = visibleData.tasks.find((item) => item.id === id)
      if (!task) {
        setDataErrorState({ token: token ?? '', message: 'That task is no longer available. Refresh your workspace and try again.', retry: 'refresh' })
        return
      }
      mutate(`/api/data/task/${encodeURIComponent(id)}`, 'PATCH', {
        title: task.title, companyId: task.companyId, dueAt: task.dueAt, priority: task.priority,
        done: !task.done, description: task.description, contactId: task.contactId,
        applicationId: task.applicationId, category: task.category,
      })
    },
  }), [dataError, dataLoading, dataRetryLabel, mutate, token, visibleData])

  return <CareerDataContext.Provider value={value}>{children}</CareerDataContext.Provider>
}
