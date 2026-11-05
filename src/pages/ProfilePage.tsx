import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { format, parseISO } from 'date-fns'
import { ArrowUpRight, AtSign, BriefcaseBusiness, Check, Code2, Globe, MapPin, Pencil, UserRound } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import { z } from 'zod'
import { useAuth } from '../context/auth-context'
import type { AppShellContext } from '../types'
import { apiErrorMessage, readJsonBody } from '../lib/api'

const profileSchema = z.object({
  displayName: z.string().trim().min(1, 'Display name is required.').max(120, 'Use 120 characters or fewer.'),
  firstName: z.string().trim().max(100, 'Use 100 characters or fewer.'),
  lastName: z.string().trim().max(100, 'Use 100 characters or fewer.'),
  phone: z.string().trim().max(40, 'Use 40 characters or fewer.').refine((value) => !value || /^\+?[0-9\s().-]{7,40}$/.test(value), 'Enter a valid phone number.'),
  location: z.string().trim().max(160, 'Use 160 characters or fewer.'),
  headline: z.string().trim().max(180, 'Use 180 characters or fewer.'),
  bio: z.string().trim().max(2000, 'Use 2,000 characters or fewer.'),
  currentRole: z.string().trim().max(160, 'Use 160 characters or fewer.'),
  skills: z.string().max(2400, 'Use 2,400 characters or fewer.').refine(
    (value) => value.split(',').map((skill) => skill.trim()).filter(Boolean).length <= 40,
    'Add no more than 40 skills.',
  ),
  linkedinUrl: urlField('Enter a valid LinkedIn URL.'),
  githubUrl: urlField('Enter a valid GitHub URL.'),
  portfolioUrl: urlField('Enter a valid portfolio URL.'),
})

function urlField(message: string) {
  return z.string().trim().max(500, 'Use 500 characters or fewer.').refine((value) => {
    if (!value) return true
    try {
      const url = new URL(value)
      return url.protocol === 'https:' || url.protocol === 'http:'
    } catch {
      return false
    }
  }, message)
}

type ProfileForm = z.infer<typeof profileSchema>
type Profile = ProfileForm & { email: string; createdAt: string }

const blankForm: ProfileForm = {
  displayName: '',
  firstName: '',
  lastName: '',
  phone: '',
  location: '',
  headline: '',
  bio: '',
  currentRole: '',
  skills: '',
  linkedinUrl: '',
  githubUrl: '',
  portfolioUrl: '',
}

const profileResponseSchema = z.object({
  displayName: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string(),
  location: z.string(),
  headline: z.string(),
  bio: z.string(),
  currentRole: z.string(),
  skills: z.array(z.string()),
  linkedinUrl: z.string(),
  githubUrl: z.string(),
  portfolioUrl: z.string(),
  createdAt: z.string(),
})

function formFromProfile(profile: z.infer<typeof profileResponseSchema>): Profile {
  return {
    displayName: profile.displayName,
    email: profile.email,
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone,
    location: profile.location,
    headline: profile.headline,
    bio: profile.bio,
    currentRole: profile.currentRole,
    skills: profile.skills.join(', '),
    linkedinUrl: profile.linkedinUrl,
    githubUrl: profile.githubUrl,
    portfolioUrl: profile.portfolioUrl,
    createdAt: profile.createdAt,
  }
}

function formFromSaved(profile: Profile): ProfileForm {
  return { ...profile }
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'C'
}

async function responseMessage(response: Response) {
  try {
    return apiErrorMessage(await readJsonBody(response), `The server request failed (${response.status}).`)
  } catch {
    return `The server returned an unreadable response (${response.status}).`
  }
}

export function ProfilePage() {
  const auth = useAuth()
  const outletContext = useOutletContext<AppShellContext | undefined>()
  const setProfileUnsavedChanges = outletContext?.setProfileUnsavedChanges
  const token = auth.session?.access_token
  const [profile, setProfile] = useState<Profile | null>(null)
  const [form, setForm] = useState<ProfileForm>(blankForm)
  const [savedForm, setSavedForm] = useState<ProfileForm>(blankForm)
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileForm, string>>>({})
  const [loadedToken, setLoadedToken] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [errorState, setErrorState] = useState<{ token: string; message: string } | null>(null)
  const [message, setMessage] = useState('')
  const error = auth.dataMode === 'api' && token && errorState?.token === token ? errorState.message : ''
  const loading = auth.dataMode === 'api' && Boolean(token) && loadedToken !== token && !error

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(savedForm), [form, savedForm])

  useEffect(() => () => setProfileUnsavedChanges?.(false), [setProfileUnsavedChanges])

  useEffect(() => {
    if (auth.dataMode !== 'api' || !token) return
    let active = true
    void fetch('/api/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (!response.ok) throw new Error(await responseMessage(response))
        const parsed = profileResponseSchema.safeParse(await readJsonBody(response))
        if (!parsed.success) throw new Error('The server returned profile data in an unsupported format.')
        const nextProfile = formFromProfile(parsed.data)
        if (active) {
          setProfile(nextProfile)
          setForm(formFromSaved(nextProfile))
          setSavedForm(formFromSaved(nextProfile))
          setLoadedToken(token)
          setErrorState(null)
        }
      })
      .catch((cause: unknown) => {
        if (active) setErrorState({
          token,
          message: cause instanceof Error ? cause.message : 'CareerOS could not load your profile.',
        })
      })
    return () => { active = false }
  }, [auth.dataMode, token])

  useEffect(() => {
    if (!editing || !dirty) return
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeLeaving)
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving)
  }, [dirty, editing])

  const updateField = (field: keyof ProfileForm, value: string) => {
    const updatedForm = { ...form, [field]: value }
    setForm(updatedForm)
    setProfileUnsavedChanges?.(JSON.stringify(updatedForm) !== JSON.stringify(savedForm))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setMessage('')
  }

  const cancelEditing = () => {
    if (dirty && !window.confirm('Discard your unsaved profile changes?')) return
    setForm(savedForm)
    setProfileUnsavedChanges?.(false)
    setErrors({})
    setErrorState(null)
    setMessage('')
    setEditing(false)
  }

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorState(null)
    setMessage('')
    const parsed = profileSchema.safeParse(form)
    if (!parsed.success) {
      const nextErrors: Partial<Record<keyof ProfileForm, string>> = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]
        if (typeof field === 'string' && field in blankForm) nextErrors[field as keyof ProfileForm] = issue.message
      }
      setErrors(nextErrors)
      return
    }
    if (!token || !profile) {
      setErrorState({ token: token ?? '', message: 'Your secure session is not available. Sign in again to edit your profile.' })
      return
    }
    setSaving(true)
    try {
      const values = parsed.data
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          skills: values.skills.split(',').map((skill) => skill.trim()).filter(Boolean),
        }),
      })
      if (!response.ok) throw new Error(await responseMessage(response))
      const parsedResponse = profileResponseSchema.safeParse(await readJsonBody(response))
      if (!parsedResponse.success) throw new Error('The server returned profile data in an unsupported format.')
      const updatedProfile = formFromProfile(parsedResponse.data)
      setProfile(updatedProfile)
      setForm(formFromSaved(updatedProfile))
      setSavedForm(formFromSaved(updatedProfile))
      setProfileUnsavedChanges?.(false)
      setEditing(false)
      try {
        await auth.updateDisplayName(updatedProfile.displayName)
      } catch {
        setMessage('Your profile was saved. Your sign-in display name could not be refreshed yet.')
        return
      }
      setMessage('Profile changes saved.')
    } catch (cause) {
      setErrorState({
        token: token ?? '',
        message: cause instanceof Error ? cause.message : 'CareerOS could not save your profile. Try again.',
      })
    } finally {
      setSaving(false)
    }
  }

  if (auth.dataMode !== 'api') {
    const demoName = auth.session?.user.user_metadata?.full_name
    const name = typeof demoName === 'string' && demoName.trim() ? demoName.trim() : auth.user?.name ?? 'CareerOS member'
    return <section className="profile-page">
      <header className="page-title-row"><div><p className="eyebrow">Account</p><h1>My profile</h1><p className="page-description">Your professional details in CareerOS.</p></div></header>
      <article className="panel profile-readonly">
        <div className="profile-avatar">{initials(name)}</div>
        <div><h2>{name}</h2><p>{auth.user?.email ?? auth.session?.user.email ?? 'Browser-local demo account'}</p></div>
        <p className="profile-setup-note">Profile editing is available in authenticated API mode. Demo workspace data remains local to this browser.</p>
      </article>
    </section>
  }

  if (loading) return <div className="workspace-loading" role="status"><span className="loading-spinner" /> Loading your profile…</div>
  if (error && !profile) {
    return <section className="profile-page">
      <ProfilePageHeader />
      <div className="data-error" role="alert"><h2>Profile unavailable</h2><p>{error}</p><button className="button button-secondary" onClick={() => window.location.reload()}>Reload profile</button></div>
    </section>
  }
  if (!profile) return null

  const skillList = profile.skills.split(',').map((skill) => skill.trim()).filter(Boolean)

  return <section className="profile-page">
    <ProfilePageHeader />
    {error && <p className="profile-alert" role="alert">{error}</p>}
    {message && <p className="profile-success" role="status"><Check size={15} />{message}</p>}
    {!editing
      ? <>
        <article className="panel profile-hero">
          <div className="profile-avatar">{initials(profile.displayName)}</div>
          <div className="profile-hero-copy">
            <p className="profile-eyebrow">Career profile</p>
            <h2>{profile.displayName}</h2>
            <p className="profile-headline">{profile.headline || 'Add a professional headline to introduce yourself.'}</p>
            <div className="profile-meta"><span>{profile.email}</span>{profile.location && <span><MapPin size={14} />{profile.location}</span>}</div>
          </div>
          <button className="button button-primary profile-edit-button" onClick={() => { setEditing(true); setErrorState(null); setMessage('') }}><Pencil size={15} /> Edit profile</button>
        </article>
        <div className="profile-grid">
          <article className="panel profile-section">
            <div className="profile-section-heading"><span className="profile-section-icon"><UserRound size={17} /></span><div><h2>About</h2><p>A little more about you</p></div></div>
            {profile.bio ? <p className="profile-bio">{profile.bio}</p> : <p className="profile-empty">Add a short bio to help people understand your background and goals.</p>}
            <dl className="profile-details">
              <div><dt>Phone</dt><dd>{profile.phone || 'Not added'}</dd></div>
              <div><dt>Location</dt><dd>{profile.location || 'Not added'}</dd></div>
              <div><dt>Current role or education</dt><dd>{profile.currentRole || 'Not added'}</dd></div>
              <div><dt>Member since</dt><dd>{format(parseISO(profile.createdAt), 'MMMM yyyy')}</dd></div>
            </dl>
          </article>
          <article className="panel profile-section">
            <div className="profile-section-heading"><span className="profile-section-icon"><BriefcaseBusiness size={17} /></span><div><h2>Skills & links</h2><p>Professional highlights</p></div></div>
            <div className="profile-skills">{skillList.length ? skillList.map((skill) => <span key={skill}>{skill}</span>) : <p className="profile-empty">Add skills that reflect your strengths.</p>}</div>
            <div className="profile-links">
              <ProfileLink href={profile.linkedinUrl} icon={<AtSign size={15} />} label="LinkedIn" />
              <ProfileLink href={profile.githubUrl} icon={<Code2 size={15} />} label="GitHub" />
              <ProfileLink href={profile.portfolioUrl} icon={<Globe size={15} />} label="Portfolio" />
            </div>
          </article>
        </div>
        <p className="profile-storage-note">Avatar uploads are not configured for this workspace. Your initials are shown instead.</p>
      </>
      : <form className="panel profile-form" onSubmit={(event) => { void saveProfile(event) }} noValidate>
        <div className="profile-form-heading"><div><h2>Edit your profile</h2><p>These details are saved to your CareerOS account.</p></div><div className="profile-form-actions"><button type="button" className="button button-secondary" onClick={cancelEditing} disabled={saving}>Cancel</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button></div></div>
        <div className="profile-form-grid">
          <ProfileField label="Display name" name="displayName" value={form.displayName} error={errors.displayName} onChange={updateField} required />
          <ProfileField label="Email address" name="email" value={profile.email} disabled />
          <ProfileField label="First name" name="firstName" value={form.firstName} error={errors.firstName} onChange={updateField} />
          <ProfileField label="Last name" name="lastName" value={form.lastName} error={errors.lastName} onChange={updateField} />
          <ProfileField label="Phone" name="phone" type="tel" value={form.phone} error={errors.phone} onChange={updateField} />
          <ProfileField label="Location" name="location" value={form.location} error={errors.location} onChange={updateField} />
          <ProfileField label="Professional headline" name="headline" value={form.headline} error={errors.headline} onChange={updateField} />
          <ProfileField label="Current role or education" name="currentRole" value={form.currentRole} error={errors.currentRole} onChange={updateField} />
          <ProfileField label="LinkedIn URL" name="linkedinUrl" type="url" value={form.linkedinUrl} error={errors.linkedinUrl} onChange={updateField} />
          <ProfileField label="GitHub URL" name="githubUrl" type="url" value={form.githubUrl} error={errors.githubUrl} onChange={updateField} />
          <ProfileField label="Portfolio URL" name="portfolioUrl" type="url" value={form.portfolioUrl} error={errors.portfolioUrl} onChange={updateField} />
          <ProfileField label="Skills" name="skills" value={form.skills} error={errors.skills} onChange={updateField} hint="Separate skills with commas." />
          <ProfileField label="About" name="bio" value={form.bio} error={errors.bio} onChange={updateField} multiline />
        </div>
        {dirty && <p className="profile-unsaved-note">You have unsaved changes. Cancel will ask before discarding them.</p>}
        <div className="profile-form-actions profile-form-actions-bottom"><button type="button" className="button button-secondary" onClick={cancelEditing} disabled={saving}>Cancel</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button></div>
      </form>}
  </section>
}

function ProfilePageHeader() {
  return <header className="page-title-row"><div><p className="eyebrow">Account</p><h1>My profile</h1><p className="page-description">Your professional details in CareerOS.</p></div></header>
}

function ProfileLink({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return href
    ? <a href={href} target="_blank" rel="noreferrer">{icon}<span>{label}</span><ArrowUpRight size={13} /></a>
    : <span className="profile-link-empty">{icon}<span>{label} not added</span></span>
}

function ProfileField({
  label, name, value, error, hint, type = 'text', multiline = false, required = false, disabled = false, onChange,
}: {
  label: string
  name: keyof ProfileForm | 'email'
  value: string
  error?: string
  hint?: string
  type?: string
  multiline?: boolean
  required?: boolean
  disabled?: boolean
  onChange?: (field: keyof ProfileForm, value: string) => void
}) {
  const id = `profile-${name}`
  return <label className={`profile-field ${multiline ? 'profile-field-full' : ''}`} htmlFor={id}>
    <span>{label}{required && <i aria-hidden="true"> *</i>}</span>
    {multiline
      ? <textarea id={id} name={name} value={value} maxLength={2000} rows={5} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} onChange={(event) => { if (name !== 'email') onChange?.(name, event.target.value) }} />
      : <input id={id} name={name} type={type} value={value} disabled={disabled} maxLength={name === 'bio' ? 2000 : 500} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} onChange={(event) => { if (name !== 'email') onChange?.(name, event.target.value) }} />}
    {hint && <small id={`${id}-hint`}>{hint}</small>}
    {error && <small className="profile-field-error" id={`${id}-error`} role="alert">{error}</small>}
  </label>
}
