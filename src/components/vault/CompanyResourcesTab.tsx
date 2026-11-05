import { useState, useEffect } from 'react'
import {
  ExternalLink,
  Plus,
  Trash2,
  FileText,
  UploadCloud,
  Globe,
  Briefcase,
  Eye,
  Download,
  X,
  AlertCircle,
} from 'lucide-react'
import { vaultApi } from '../../lib/vaultApi'
import { useAuth } from '../../context/auth-context'
import type { CompanyResource, JobDescription, VaultFile, CompanyResourceType } from '../../types'
import { VaultFileDetailModal } from './VaultFileDetailModal'

interface CompanyResourcesTabProps {
  companyId: string
  companyName: string
}

export function CompanyResourcesTab({ companyId, companyName }: CompanyResourcesTabProps) {
  const auth = useAuth()
  const token = auth.session?.access_token

  const [links, setLinks] = useState<CompanyResource[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [jobDescriptions, setJobDescriptions] = useState<JobDescription[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddingLink, setIsAddingLink] = useState(false)
  const [isUploadingDoc, setIsUploadingDoc] = useState(false)
  const [activePreviewFile, setActivePreviewFile] = useState<VaultFile | null>(null)

  // Add Link State
  const [linkTitle, setLinkTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkDesc, setLinkDesc] = useState('')
  const [resourceType, setResourceType] = useState<CompanyResourceType>('CAREERS_PAGE')
  const [isSubmittingLink, setIsSubmittingLink] = useState(false)

  // Upload Doc State
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [docDisplayName, setDocDisplayName] = useState('')
  const [docDescription, setDocDescription] = useState('')
  const [isSubmittingDoc, setIsSubmittingDoc] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const loadResources = async () => {
    setIsLoading(true)
    try {
      const data = await vaultApi.getCompanyResources(companyId, token)
      setLinks(data.links)
      setDocuments(data.documents)
      setJobDescriptions(data.jobDescriptions)
    } catch (err) {
      console.error('Failed to load company resources', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadResources()
  }, [companyId, token])

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!linkTitle.trim() || !linkUrl.trim()) return

    setIsSubmittingLink(true)
    try {
      const created = await vaultApi.createCompanyResource(
        companyId,
        {
          title: linkTitle.trim(),
          url: linkUrl.trim(),
          description: linkDesc.trim() || null,
          resourceType,
        },
        token,
      )
      setLinks((prev) => [created, ...prev])
      setIsAddingLink(false)
      setLinkTitle('')
      setLinkUrl('')
      setLinkDesc('')
    } catch (err: any) {
      alert(err.message || 'Failed to add resource link')
    } finally {
      setIsSubmittingLink(false)
    }
  }

  const handleDeleteLink = async (resourceId: string) => {
    try {
      await vaultApi.deleteCompanyResource(companyId, resourceId, token)
      setLinks((prev) => prev.filter((r) => r.id !== resourceId))
    } catch (err: any) {
      alert(err.message || 'Failed to remove link')
    }
  }

  const handleUploadCompanyDoc = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFile) return

    setIsSubmittingDoc(true)
    setUploadError('')

    try {
      const file = await vaultApi.uploadFile(uploadFile, {
        displayName: docDisplayName.trim() || uploadFile.name,
        category: 'SUPPORTING_DOCUMENT',
        description: docDescription.trim() || undefined,
        companyId,
        token,
      })

      setDocuments((prev) => [
        {
          id: `cd-${file.id}`,
          companyId,
          vaultFileId: file.id,
          vaultFile: file,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ])

      setIsUploadingDoc(false)
      setUploadFile(null)
      setDocDisplayName('')
      setDocDescription('')
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload document')
    } finally {
      setIsSubmittingDoc(false)
    }
  }

  const formatResourceType = (type: string) => {
    return type.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  return (
    <div className="company-resources-container">
      {/* Important Links Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>
              Important Links & Portals
            </h4>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--muted)' }}>
              Official websites, job listings, and engineering blogs for {companyName}.
            </p>
          </div>
          <button
            type="button"
            className="button button-secondary"
            style={{ height: '30px', fontSize: '11px' }}
            onClick={() => setIsAddingLink(true)}
          >
            <Plus size={13} /> Add Link
          </button>
        </div>

        {isLoading ? (
          <div style={{ padding: '16px', background: 'var(--surface-muted)', borderRadius: '8px', textAlign: 'center', fontSize: '12px', color: 'var(--muted)' }}>
            Loading company resources…
          </div>
        ) : links.length > 0 ? (
          <div className="resource-links-grid">
            {links.map((link) => (
              <div key={link.id} className="resource-link-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <Globe size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <strong style={{ fontSize: '13px', color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {link.title}
                      </strong>
                      <span className="vault-badge" style={{ fontSize: '9px', padding: '1px 5px' }}>
                        {formatResourceType(link.resourceType)}
                      </span>
                    </div>
                    {link.description && (
                      <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {link.description}
                      </p>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="row-action-button"
                    title="Open link"
                  >
                    <ExternalLink size={13} />
                  </a>
                  <button
                    type="button"
                    className="row-delete-button"
                    title="Delete link"
                    onClick={() => handleDeleteLink(link.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '16px', background: 'var(--surface-muted)', borderRadius: '8px', textAlign: 'center', fontSize: '12px', color: 'var(--muted)' }}>
            No links added yet. Save careers pages, blogs, or recruiter links for this company.
          </div>
        )}
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '4px 0' }} />

      {/* Company Documents & Attached Files */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>
              Company Documents & JDs
            </h4>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--muted)' }}>
              Central Vault files and saved job descriptions linked directly to {companyName}.
            </p>
          </div>
          <button
            type="button"
            className="button button-secondary"
            style={{ height: '30px', fontSize: '11px' }}
            onClick={() => setIsUploadingDoc(true)}
          >
            <UploadCloud size={13} /> Upload Document
          </button>
        </div>

        {documents.length > 0 || jobDescriptions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Job Descriptions for this company */}
            {jobDescriptions.map((jd) => (
              <div
                key={jd.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  border: '1px solid var(--line)',
                  borderRadius: '8px',
                  background: 'var(--surface)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Briefcase size={16} style={{ color: '#059669' }} />
                  <div>
                    <strong style={{ fontSize: '13px', color: 'var(--ink)' }}>JD: {jd.title}</strong>
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                      {jd.location || 'Remote'} • Saved opportunity
                    </div>
                  </div>
                </div>

                {jd.vaultFile && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className="button button-secondary"
                      style={{ height: '26px', fontSize: '10px', padding: '0 8px' }}
                      onClick={() => setActivePreviewFile(jd.vaultFile!)}
                    >
                      <Eye size={11} /> Preview
                    </button>
                    <button
                      type="button"
                      className="button button-secondary"
                      style={{ height: '26px', fontSize: '10px', padding: '0 8px' }}
                      onClick={() =>
                        vaultApi.downloadFile(
                          jd.vaultFile!.id,
                          jd.vaultFile!.originalFilename,
                          token,
                        )
                      }
                    >
                      <Download size={11} /> Download
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Direct Company Documents */}
            {documents.map((doc) => {
              const file = doc.vaultFile
              if (!file) return null
              return (
                <div
                  key={doc.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    border: '1px solid var(--line)',
                    borderRadius: '8px',
                    background: 'var(--surface)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileText size={16} style={{ color: 'var(--accent)' }} />
                    <div>
                      <strong style={{ fontSize: '13px', color: 'var(--ink)' }}>{file.displayName}</strong>
                      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                        {file.originalFilename} • {(file.fileSizeBytes / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className="button button-secondary"
                      style={{ height: '26px', fontSize: '10px', padding: '0 8px' }}
                      onClick={() => setActivePreviewFile(file)}
                    >
                      <Eye size={11} /> Preview
                    </button>
                    <button
                      type="button"
                      className="button button-secondary"
                      style={{ height: '26px', fontSize: '10px', padding: '0 8px' }}
                      onClick={() =>
                        vaultApi.downloadFile(
                          file.id,
                          file.originalFilename || file.displayName,
                          token,
                        )
                      }
                    >
                      <Download size={11} /> Download
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ padding: '16px', background: 'var(--surface-muted)', borderRadius: '8px', textAlign: 'center', fontSize: '12px', color: 'var(--muted)' }}>
            No company documents or job descriptions attached yet.
          </div>
        )}
      </div>

      {/* Add Link Modal */}
      {isAddingLink && (
        <div className="vault-modal-scrim" onClick={(e) => e.target === e.currentTarget && setIsAddingLink(false)}>
          <div className="vault-modal" role="dialog" aria-modal="true">
            <div className="vault-modal-header">
              <h2>Add Company Resource Link</h2>
              <button type="button" className="row-action-button" onClick={() => setIsAddingLink(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddLink} style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="vault-modal-body">
                <div className="vault-form-field">
                  <label className="vault-field-label" htmlFor="link-title-input">
                    Resource Title <span style={{ color: 'var(--accent)' }}>*</span>
                  </label>
                  <input
                    id="link-title-input"
                    className="vault-input"
                    required
                    placeholder="e.g. Engineering Career Portal"
                    value={linkTitle}
                    onChange={(e) => setLinkTitle(e.target.value)}
                  />
                </div>

                <div className="vault-form-field">
                  <label className="vault-field-label" htmlFor="link-url-input">
                    URL (http/https) <span style={{ color: 'var(--accent)' }}>*</span>
                  </label>
                  <input
                    id="link-url-input"
                    type="url"
                    className="vault-input"
                    required
                    placeholder="https://company.com/careers"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                  />
                </div>

                <div className="vault-form-field">
                  <label className="vault-field-label" htmlFor="link-type-select">
                    Resource Type
                  </label>
                  <select
                    id="link-type-select"
                    className="vault-select-full"
                    value={resourceType}
                    onChange={(e) => setResourceType(e.target.value as CompanyResourceType)}
                  >
                    <option value="CAREERS_PAGE">Careers Page</option>
                    <option value="OFFICIAL_WEBSITE">Official Website</option>
                    <option value="LINKEDIN">LinkedIn Company</option>
                    <option value="JOB_POSTING">Job Posting</option>
                    <option value="COMPANY_BLOG">Company Blog</option>
                    <option value="DOCUMENTATION">Documentation</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div className="vault-form-field">
                  <label className="vault-field-label" htmlFor="link-desc-input">
                    Description (Optional)
                  </label>
                  <textarea
                    id="link-desc-input"
                    className="vault-textarea"
                    rows={2}
                    placeholder="Notes on this resource..."
                    value={linkDesc}
                    onChange={(e) => setLinkDesc(e.target.value)}
                  />
                </div>
              </div>

              <div className="vault-modal-footer">
                <button type="button" className="button button-secondary" onClick={() => setIsAddingLink(false)}>
                  Cancel
                </button>
                <button type="submit" className="button button-primary" disabled={isSubmittingLink || !linkTitle.trim() || !linkUrl.trim()}>
                  {isSubmittingLink ? 'Saving…' : 'Save Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {isUploadingDoc && (
        <div className="vault-modal-scrim" onClick={(e) => e.target === e.currentTarget && setIsUploadingDoc(false)}>
          <div className="vault-modal" role="dialog" aria-modal="true">
            <div className="vault-modal-header">
              <div>
                <h2>Upload Document for {companyName}</h2>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                  Document will be stored in your Career Vault and linked to this company.
                </div>
              </div>
              <button type="button" className="row-action-button" onClick={() => setIsUploadingDoc(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUploadCompanyDoc} style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="vault-modal-body">
                {uploadError && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: '#fef2f2',
                      color: '#b91c1c',
                      fontSize: '12px',
                      border: '1px solid #fecaca',
                    }}
                  >
                    <AlertCircle size={15} style={{ flexShrink: 0 }} />
                    <span>{uploadError}</span>
                  </div>
                )}

                <div className="vault-form-field">
                  <label className="vault-field-label">
                    Select File (PDF, DOCX, Images, Text) <span style={{ color: 'var(--accent)' }}>*</span>
                  </label>
                  <input
                    className="vault-input"
                    type="file"
                    required
                    accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null
                      setUploadFile(f)
                      if (f && !docDisplayName) {
                        setDocDisplayName(f.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '))
                      }
                    }}
                  />
                </div>

                <div className="vault-form-field">
                  <label className="vault-field-label" htmlFor="doc-display-name">
                    Display Name
                  </label>
                  <input
                    id="doc-display-name"
                    className="vault-input"
                    value={docDisplayName}
                    placeholder="e.g. Interview Prep & System Specs"
                    onChange={(e) => setDocDisplayName(e.target.value)}
                  />
                </div>

                <div className="vault-form-field">
                  <label className="vault-field-label" htmlFor="doc-desc-input">
                    Description (Optional)
                  </label>
                  <textarea
                    id="doc-desc-input"
                    className="vault-textarea"
                    rows={2}
                    value={docDescription}
                    placeholder="Brief description or context..."
                    onChange={(e) => setDocDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="vault-modal-footer">
                <button type="button" className="button button-secondary" onClick={() => setIsUploadingDoc(false)}>
                  Cancel
                </button>
                <button type="submit" className="button button-primary" disabled={isSubmittingDoc || !uploadFile}>
                  {isSubmittingDoc ? 'Uploading…' : 'Upload to Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {activePreviewFile && (
        <VaultFileDetailModal
          file={activePreviewFile}
          onClose={() => setActivePreviewFile(null)}
          onUpdate={(u) => setActivePreviewFile(u)}
          onDelete={() => {
            setActivePreviewFile(null)
            loadResources()
          }}
        />
      )}
    </div>
  )
}
