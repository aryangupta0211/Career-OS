import { useState, useMemo, useRef, useEffect, useContext } from 'react'
import { Building2, Plus, Check, Search, AlertCircle, X } from 'lucide-react'
import type { Company } from '../types'
import { CareerDataContext } from '../context/careerDataContext'

interface CompanySelectWithCreateProps {
  value: string
  onChange: (companyId: string) => void
  label?: string
  placeholder?: string
  required?: boolean
  allowClear?: boolean
  companies?: Company[]
  onCompanyCreated?: (company: Company) => void
  onCreateCompany?: (name: string, website?: string) => Promise<Company> | Company
}

export function normalizeCompanyName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function extractDomain(url?: string | null): string {
  if (!url) return ''
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`)
    return parsed.hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return ''
  }
}

export function CompanySelectWithCreate({
  value,
  onChange,
  label = 'Company',
  placeholder = 'Select or create company...',
  required = false,
  allowClear = true,
  companies: propsCompanies,
  onCompanyCreated,
  onCreateCompany,
}: CompanySelectWithCreateProps) {
  const careerCtx = useContext(CareerDataContext)
  const availableCompanies = propsCompanies || careerCtx?.data?.companies || []
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreatingInline, setIsCreatingInline] = useState(false)

  // Inline creation fields
  const [newName, setNewName] = useState('')
  const [newWebsite, setNewWebsite] = useState('')
  const [newCareersUrl, setNewCareersUrl] = useState('')
  const [duplicateWarning, setDuplicateWarning] = useState<Company | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedCompany = useMemo(() => {
    return availableCompanies.find((c) => c.id === value) || null
  }, [availableCompanies, value])

  const filteredCompanies = useMemo(() => {
    if (!searchTerm.trim()) return availableCompanies
    const term = searchTerm.toLowerCase()
    return availableCompanies.filter((c) =>
      c.name.toLowerCase().includes(term) || (c.website && c.website.toLowerCase().includes(term))
    )
  }, [availableCompanies, searchTerm])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Duplicate check when typing new company
  useEffect(() => {
    if (!newName.trim()) {
      setDuplicateWarning(null)
      return
    }
    const norm = normalizeCompanyName(newName)
    const newDom = extractDomain(newWebsite)
    const match = availableCompanies.find((c) => {
      const matchName = normalizeCompanyName(c.name) === norm
      const matchDomain = newDom && c.website && extractDomain(c.website) === newDom
      return matchName || matchDomain
    })
    setDuplicateWarning(match || null)
  }, [newName, newWebsite, availableCompanies])

  const handleStartInlineCreate = () => {
    setIsCreatingInline(true)
    setNewName(searchTerm.trim())
    setNewWebsite('')
    setNewCareersUrl('')
  }

  const handleConfirmCreate = async () => {
    if (!newName.trim()) return

    try {
      let createdCompany: Company
      if (onCreateCompany) {
        createdCompany = await onCreateCompany(newName.trim(), newWebsite.trim() || undefined)
      } else {
        const id = `company-${Date.now()}`
        const newRecord: Company = {
          id,
          name: newName.trim(),
          website: newWebsite.trim(),
          careersUrl: newCareersUrl.trim(),
          industry: '',
          location: '',
          size: '',
          tags: [],
          linkedinUrl: '',
          notes: '',
          createdAt: new Date().toISOString(),
        }
        if (careerCtx?.addRecord) {
          careerCtx.addRecord('company', {
            name: newName.trim(),
            website: newWebsite.trim(),
            careersUrl: newCareersUrl.trim(),
            industry: '',
            location: '',
            size: '',
            tags: '',
            linkedinUrl: '',
            notes: '',
          })
        }
        createdCompany = newRecord
      }

      onCompanyCreated?.(createdCompany)
      onChange(createdCompany.id)
      setIsCreatingInline(false)
      setIsOpen(false)
      setSearchTerm('')
      setNewName('')
      setNewWebsite('')
      setNewCareersUrl('')
    } catch (err) {
      console.error('Failed to create company inline:', err)
    }
  }

  return (
    <div className="company-select-with-create" ref={containerRef} style={{ position: 'relative' }}>
      {label && (
        <label className="vault-field-label">
          {label} {required && <span style={{ color: 'var(--accent)' }}>*</span>}
        </label>
      )}

      {/* Main Selector Button */}
      <div
        className="vault-input"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          padding: '8px 12px',
          background: 'var(--surface)',
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
          <Building2 size={15} style={{ color: selectedCompany ? 'var(--accent)' : 'var(--muted)' }} />
          <span style={{ color: selectedCompany ? 'var(--ink)' : 'var(--muted)', fontSize: '13px' }}>
            {selectedCompany ? selectedCompany.name : placeholder}
          </span>
        </div>

        {selectedCompany && allowClear && (
          <button
            type="button"
            className="row-action-button"
            style={{ padding: '2px', border: 'none', background: 'transparent' }}
            onClick={(e) => {
              e.stopPropagation()
              onChange('')
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="company-select-dropdown"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 100,
            marginTop: '4px',
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            overflow: 'hidden',
          }}
        >
          {!isCreatingInline ? (
            <div style={{ padding: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 10px',
                  border: '1px solid var(--line)',
                  borderRadius: '6px',
                  background: 'var(--surface-muted)',
                  marginBottom: '8px',
                }}
              >
                <Search size={14} style={{ color: 'var(--muted)' }} />
                <input
                  type="text"
                  placeholder="Search existing companies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    width: '100%',
                    fontSize: '12px',
                    color: 'var(--ink)',
                  }}
                  autoFocus
                />
              </div>

              <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                {allowClear && (
                  <div
                    style={{
                      padding: '7px 10px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      color: 'var(--muted)',
                    }}
                    onClick={() => {
                      onChange('')
                      setIsOpen(false)
                    }}
                  >
                    <em>No Company (Independent)</em>
                  </div>
                )}

                {filteredCompanies.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '7px 10px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      background: value === c.id ? 'var(--surface-muted)' : 'transparent',
                    }}
                    onClick={() => {
                      onChange(c.id)
                      setIsOpen(false)
                    }}
                  >
                    <div>
                      <strong style={{ color: 'var(--ink)' }}>{c.name}</strong>
                      {c.website && <span style={{ marginLeft: '6px', color: 'var(--muted)', fontSize: '11px' }}>({extractDomain(c.website)})</span>}
                    </div>
                    {value === c.id && <Check size={14} style={{ color: 'var(--accent)' }} />}
                  </div>
                ))}

                {filteredCompanies.length === 0 && (
                  <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--muted)' }}>
                    No matching company found.
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--line)', paddingTop: '8px', marginTop: '4px' }}>
                <button
                  type="button"
                  className="button button-secondary"
                  style={{ width: '100%', justifyContent: 'center', fontSize: '12px', height: '32px' }}
                  onClick={handleStartInlineCreate}
                >
                  <Plus size={14} /> Create "{searchTerm.trim() || 'New Company'}"
                </button>
              </div>
            </div>
          ) : (
            /* Inline Company Creation Form */
            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '12px', color: 'var(--ink)' }}>Quick Create Company</strong>
                <button
                  type="button"
                  className="row-action-button"
                  style={{ border: 'none', background: 'transparent' }}
                  onClick={() => setIsCreatingInline(false)}
                >
                  <X size={14} />
                </button>
              </div>

              {duplicateWarning && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: '#fef3c7',
                    border: '1px solid #fde68a',
                    fontSize: '11px',
                    color: '#92400e',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertCircle size={14} style={{ flexShrink: 0 }} />
                    <span>Existing match: <strong>{duplicateWarning.name}</strong></span>
                  </div>
                  <button
                    type="button"
                    className="button button-secondary"
                    style={{ fontSize: '10px', padding: '2px 8px', height: '22px' }}
                    onClick={() => {
                      onChange(duplicateWarning.id)
                      setIsCreatingInline(false)
                      setIsOpen(false)
                    }}
                  >
                    Reuse
                  </button>
                </div>
              )}

              <div>
                <label className="vault-field-label" style={{ fontSize: '11px' }}>Company Name *</label>
                <input
                  type="text"
                  aria-label="Company Name"
                  className="vault-input"
                  style={{ fontSize: '12px', padding: '6px 8px' }}
                  placeholder="e.g. Microsoft"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label className="vault-field-label" style={{ fontSize: '11px' }}>Website (Optional)</label>
                <input
                  type="url"
                  aria-label="Website"
                  className="vault-input"
                  style={{ fontSize: '12px', padding: '6px 8px' }}
                  placeholder="https://microsoft.com"
                  value={newWebsite}
                  onChange={(e) => setNewWebsite(e.target.value)}
                />
              </div>

              <div>
                <label className="vault-field-label" style={{ fontSize: '11px' }}>Careers Page (Optional)</label>
                <input
                  type="url"
                  aria-label="Careers Page"
                  className="vault-input"
                  style={{ fontSize: '12px', padding: '6px 8px' }}
                  placeholder="https://careers.microsoft.com"
                  value={newCareersUrl}
                  onChange={(e) => setNewCareersUrl(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  type="button"
                  className="button button-secondary"
                  style={{ flex: 1, fontSize: '12px', height: '30px', justifyContent: 'center' }}
                  onClick={() => setIsCreatingInline(false)}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="button button-primary"
                  disabled={!newName.trim()}
                  style={{ flex: 1, fontSize: '12px', height: '30px', justifyContent: 'center' }}
                  onClick={handleConfirmCreate}
                >
                  Create & Select
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
