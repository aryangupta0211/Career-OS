import { useState, useEffect } from 'react'
import {
  FileText,
  UploadCloud,
  Paperclip,
  Trash2,
  Eye,
  Download,
  AlertCircle,
  X,
  FileBadge,
} from 'lucide-react'
import { vaultApi } from '../lib/vaultApi'
import { useAuth } from '../context/auth-context'
import type { VaultFile, DocumentRole } from '../types'
import { VaultFileDetailModal } from './vault/VaultFileDetailModal'

interface ApplicationDocumentsTabProps {
  applicationId: string
  jobTitle: string
  resumeReference?: string
}

export function ApplicationDocumentsTab({
  applicationId,
  jobTitle,
  resumeReference,
}: ApplicationDocumentsTabProps) {
  const auth = useAuth()
  const token = auth.session?.access_token

  const [documents, setDocuments] = useState<any[]>([])
  const [allVaultFiles, setAllVaultFiles] = useState<VaultFile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAttaching, setIsAttaching] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [activePreviewFile, setActivePreviewFile] = useState<VaultFile | null>(null)

  // Attach Existing State
  const [selectedVaultFileId, setSelectedVaultFileId] = useState('')
  const [attachRole, setAttachRole] = useState<DocumentRole>('SUPPORTING_DOCUMENT')
  const [attachNotes, setAttachNotes] = useState('')
  const [isSubmittingAttach, setIsSubmittingAttach] = useState(false)

  // Upload New State
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadDisplayName, setUploadDisplayName] = useState('')
  const [uploadRole, setUploadRole] = useState<DocumentRole>('SUPPORTING_DOCUMENT')
  const [isSubmittingUpload, setIsSubmittingUpload] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const loadDocs = async () => {
    setIsLoading(true)
    try {
      const data = await vaultApi.getApplicationDocuments(applicationId, token)
      setDocuments(data)
    } catch (err) {
      console.error('Failed to load application documents', err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadVaultFiles = async () => {
    try {
      const res = await vaultApi.getFiles({ token })
      setAllVaultFiles(res.files || [])
    } catch (err) {
      console.error('Failed to load vault files', err)
    }
  }

  useEffect(() => {
    loadDocs()
    loadVaultFiles()
  }, [applicationId, token])

  const handleAttachExisting = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVaultFileId) return

    setIsSubmittingAttach(true)
    try {
      await vaultApi.linkApplicationDocument(
        applicationId,
        {
          vaultFileId: selectedVaultFileId,
          documentRole: attachRole,
          notes: attachNotes.trim() || null,
        },
        token
      )
      await loadDocs()
      setIsAttaching(false)
      setSelectedVaultFileId('')
      setAttachNotes('')
    } catch (err: any) {
      alert(err.message || 'Failed to attach document')
    } finally {
      setIsSubmittingAttach(false)
    }
  }

  const handleUploadAndAttach = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFile) return

    setIsSubmittingUpload(true)
    setUploadError('')

    try {
      // 1. Upload to Vault
      const categoryMap: Record<DocumentRole, any> = {
        SUBMITTED_RESUME: 'RESUME',
        COVER_LETTER: 'COVER_LETTER',
        JOB_DESCRIPTION: 'JOB_DESCRIPTION',
        PORTFOLIO: 'PORTFOLIO',
        CERTIFICATE: 'CERTIFICATE',
        SUPPORTING_DOCUMENT: 'SUPPORTING_DOCUMENT',
        OTHER: 'OTHER',
      }

      const file = await vaultApi.uploadFile(uploadFile, {
        displayName: uploadDisplayName.trim() || uploadFile.name,
        category: categoryMap[uploadRole] || 'SUPPORTING_DOCUMENT',
        applicationId,
        token,
      })

      // 2. Link specifically to application documents table
      await vaultApi.linkApplicationDocument(
        applicationId,
        {
          vaultFileId: file.id,
          documentRole: uploadRole,
        },
        token
      )

      await loadDocs()
      setIsUploading(false)
      setUploadFile(null)
      setUploadDisplayName('')
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload document')
    } finally {
      setIsSubmittingUpload(false)
    }
  }

  const handleDetachDoc = async (documentId: string) => {
    const ok = window.confirm('Unlink this document from the application? The file will remain in your Career Vault.')
    if (!ok) return
    try {
      await vaultApi.unlinkApplicationDocument(applicationId, documentId, token)
      setDocuments((prev) => prev.filter((d) => d.id !== documentId))
    } catch (err: any) {
      alert(err.message || 'Failed to unlink document')
    }
  }

  const roleBadge = (role: string) => {
    const clean = role.replace(/_/g, ' ')
    return (
      <span
        style={{
          display: 'inline-block',
          fontSize: '10px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          padding: '2px 6px',
          borderRadius: '4px',
          background: 'var(--surface-muted)',
          color: 'var(--ink)',
          border: '1px solid var(--line)',
        }}
      >
        {clean}
      </span>
    )
  }

  return (
    <div className="application-documents-tab" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Historical Resume Banner */}
      {resumeReference && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileBadge size={16} style={{ color: '#4f46e5' }} />
            <span>
              Submitted Resume Snapshot: <strong>{resumeReference}</strong>
            </span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Immutable historical record</span>
        </div>
      )}

      {/* Header with actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>
            Application Documents ({documents.length})
          </h4>
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
            Files connected to {jobTitle}. Stored once in Vault and referenced here.
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="button button-secondary"
            style={{ height: '30px', fontSize: '12px' }}
            onClick={() => setIsAttaching(true)}
          >
            <Paperclip size={13} /> Attach Vault File
          </button>
          <button
            type="button"
            className="button button-primary"
            style={{ height: '30px', fontSize: '12px' }}
            onClick={() => setIsUploading(true)}
          >
            <UploadCloud size={13} /> Upload New
          </button>
        </div>
      </div>

      {/* Documents List */}
      {isLoading ? (
        <div style={{ padding: '24px', textAlign: 'center', fontSize: '12px', color: 'var(--muted)' }}>
          Loading documents...
        </div>
      ) : documents.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {documents.map((doc) => {
            const file = doc.vaultFile
            return (
              <div
                key={doc.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  border: '1px solid var(--line)',
                  borderRadius: '8px',
                  background: 'var(--surface)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileText size={18} style={{ color: 'var(--accent)' }} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '13px', color: 'var(--ink)' }}>
                        {file?.displayName || 'Document'}
                      </strong>
                      {roleBadge(doc.documentRole || 'SUPPORTING_DOCUMENT')}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                      {file?.originalFilename} {file?.fileSizeBytes && `• ${(file.fileSizeBytes / 1024).toFixed(1)} KB`}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {file && (
                    <>
                      <button
                        type="button"
                        className="row-action-button"
                        title="Preview Document"
                        onClick={() => setActivePreviewFile(file)}
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        type="button"
                        className="row-action-button"
                        title="Download Document"
                        onClick={() =>
                          vaultApi.downloadFile(file.id, file.originalFilename || file.displayName, token)
                        }
                      >
                        <Download size={14} />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="row-delete-button"
                    title="Unlink Document (File remains in Vault)"
                    onClick={() => handleDetachDoc(doc.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div
          style={{
            padding: '32px 16px',
            textAlign: 'center',
            background: 'var(--surface-muted)',
            borderRadius: '8px',
            border: '1px dashed var(--line)',
          }}
        >
          <FileText size={28} style={{ color: 'var(--subtle)', margin: '0 auto 8px' }} />
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
            No documents linked to this application yet.
          </p>
          <p style={{ margin: '4px 0 12px', fontSize: '11px', color: 'var(--muted)' }}>
            Attach your submitted resume version, tailored cover letter, or portfolio.
          </p>
          <button
            type="button"
            className="button button-secondary"
            style={{ fontSize: '12px' }}
            onClick={() => setIsAttaching(true)}
          >
            <Paperclip size={13} /> Attach from Vault
          </button>
        </div>
      )}

      {/* Attach Existing Modal */}
      {isAttaching && (
        <div className="vault-modal-scrim" onClick={(e) => e.target === e.currentTarget && setIsAttaching(false)}>
          <div className="vault-modal" role="dialog" aria-modal="true">
            <div className="vault-modal-header">
              <h2>Attach Existing Vault File</h2>
              <button type="button" className="row-action-button" onClick={() => setIsAttaching(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAttachExisting} style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="vault-modal-body">
                <div className="vault-form-field">
                  <label className="vault-field-label">Select Vault Document *</label>
                  <select
                    className="vault-select-full"
                    required
                    value={selectedVaultFileId}
                    onChange={(e) => setSelectedVaultFileId(e.target.value)}
                  >
                    <option value="">-- Choose a document from your Vault --</option>
                    {allVaultFiles
                      .filter((f) => f.status === 'ACTIVE')
                      .map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.displayName} ({f.category})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="vault-form-field">
                  <label className="vault-field-label">Document Role *</label>
                  <select
                    className="vault-select-full"
                    value={attachRole}
                    onChange={(e) => setAttachRole(e.target.value as DocumentRole)}
                  >
                    <option value="SUBMITTED_RESUME">Submitted Resume</option>
                    <option value="COVER_LETTER">Cover Letter</option>
                    <option value="JOB_DESCRIPTION">Job Description</option>
                    <option value="PORTFOLIO">Portfolio</option>
                    <option value="CERTIFICATE">Certificate</option>
                    <option value="SUPPORTING_DOCUMENT">Supporting Document</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div className="vault-form-field">
                  <label className="vault-field-label">Notes (Optional)</label>
                  <input
                    className="vault-input"
                    placeholder="e.g. Tailored specifically for this engineering role"
                    value={attachNotes}
                    onChange={(e) => setAttachNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="vault-modal-footer">
                <button type="button" className="button button-secondary" onClick={() => setIsAttaching(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={isSubmittingAttach || !selectedVaultFileId}
                >
                  {isSubmittingAttach ? 'Attaching…' : 'Attach to Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload and Attach Modal */}
      {isUploading && (
        <div className="vault-modal-scrim" onClick={(e) => e.target === e.currentTarget && setIsUploading(false)}>
          <div className="vault-modal" role="dialog" aria-modal="true">
            <div className="vault-modal-header">
              <h2>Upload Document for {jobTitle}</h2>
              <button type="button" className="row-action-button" onClick={() => setIsUploading(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUploadAndAttach} style={{ display: 'flex', flexDirection: 'column' }}>
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
                    }}
                  >
                    <AlertCircle size={15} />
                    <span>{uploadError}</span>
                  </div>
                )}

                <div className="vault-form-field">
                  <label className="vault-field-label">Select File *</label>
                  <input
                    className="vault-input"
                    type="file"
                    required
                    accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null
                      setUploadFile(f)
                      if (f && !uploadDisplayName) {
                        setUploadDisplayName(f.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '))
                      }
                    }}
                  />
                </div>

                <div className="vault-form-field">
                  <label className="vault-field-label">Display Name</label>
                  <input
                    className="vault-input"
                    value={uploadDisplayName}
                    placeholder="e.g. Customized Cover Letter - SDE"
                    onChange={(e) => setUploadDisplayName(e.target.value)}
                  />
                </div>

                <div className="vault-form-field">
                  <label className="vault-field-label">Document Role *</label>
                  <select
                    className="vault-select-full"
                    value={uploadRole}
                    onChange={(e) => setUploadRole(e.target.value as DocumentRole)}
                  >
                    <option value="SUBMITTED_RESUME">Submitted Resume</option>
                    <option value="COVER_LETTER">Cover Letter</option>
                    <option value="JOB_DESCRIPTION">Job Description</option>
                    <option value="PORTFOLIO">Portfolio</option>
                    <option value="CERTIFICATE">Certificate</option>
                    <option value="SUPPORTING_DOCUMENT">Supporting Document</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="vault-modal-footer">
                <button type="button" className="button button-secondary" onClick={() => setIsUploading(false)}>
                  Cancel
                </button>
                <button type="submit" className="button button-primary" disabled={isSubmittingUpload || !uploadFile}>
                  {isSubmittingUpload ? 'Uploading…' : 'Upload & Attach'}
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
          onUpdate={(u: VaultFile) => setActivePreviewFile(u)}
          onDelete={() => {
            setActivePreviewFile(null)
            loadDocs()
          }}
        />
      )}
    </div>
  )
}
