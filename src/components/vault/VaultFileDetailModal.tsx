import { useState, type FormEvent } from 'react'
import {
  Download,
  Trash2,
  X,
  FileText,
  HardDrive,
  Calendar,
  Building2,
  BriefcaseBusiness,
  Check,
  Tag,
  Clock,
  FileType,
} from 'lucide-react'
import { vaultApi } from '../../lib/vaultApi'
import { useAuth } from '../../context/auth-context'
import { useCareerData } from '../../context/useCareerData'
import type { VaultFile, VaultFileCategory } from '../../types'

interface VaultFileDetailModalProps {
  file: VaultFile
  onClose: () => void
  onUpdate: (updated: VaultFile) => void
  onDelete: (deletedId: string) => void
}

export function VaultFileDetailModal({
  file,
  onClose,
  onUpdate,
  onDelete,
}: VaultFileDetailModalProps) {
  const auth = useAuth()
  const token = auth.session?.access_token
  const { data } = useCareerData()

  const companies = data?.companies || []
  const applications = data?.applications || []

  const initialCompanyId = file.companyDocuments?.[0]?.companyId || ''
  const initialAppId = file.applicationDocuments?.[0]?.applicationId || ''

  const [category, setCategory] = useState<VaultFileCategory>(file.category)
  const [displayName, setDisplayName] = useState(file.displayName)
  const [description, setDescription] = useState(file.description || '')
  const [tags, setTags] = useState(file.tags?.join(', ') || '')
  const [companyId, setCompanyId] = useState(initialCompanyId)
  const [applicationId, setApplicationId] = useState(initialAppId)

  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const isPdf = file.extension === '.pdf'
  const isImage = ['.png', '.jpg', '.jpeg', '.webp'].includes(file.extension)
  const isText = file.extension === '.txt'
  const canPreview = isPdf || isImage || isText

  const fileUrl = `/api/vault/files/${file.id}/content${token ? `?token=${encodeURIComponent(token)}` : ''}`

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B'
    const mb = bytes / (1024 * 1024)
    if (mb < 1) return `${(bytes / 1024).toFixed(1)} KB (${bytes.toLocaleString()} bytes)`
    return `${mb.toFixed(2)} MB (${bytes.toLocaleString()} bytes)`
  }

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      await vaultApi.downloadFile(file.id, file.originalFilename || file.displayName, token)
    } catch (err: any) {
      alert(err.message || 'Failed to download file.')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`Move "${file.displayName}" to trash?`)) return
    setIsDeleting(true)
    try {
      await vaultApi.deleteFile(file.id, false, false, token)
      onDelete(file.id)
      onClose()
    } catch (err: any) {
      alert(err.message || 'Failed to delete file.')
      setIsDeleting(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setErrorMessage('')

    try {
      const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean)
      const updated = await vaultApi.updateFile(
        file.id,
        {
          displayName: displayName.trim() || file.originalFilename,
          description: description.trim() || null,
          category,
          tags: tagList,
          companyId: companyId ? companyId : null,
          applicationId: applicationId ? applicationId : null,
        },
        token,
      )

      onUpdate(updated)
      onClose()
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update file.')
      setIsSaving(false)
    }
  }

  return (
    <div className="vault-modal-scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="vault-modal large" role="dialog" aria-modal="true" aria-labelledby="file-detail-title">
        {/* Header */}
        <div className="vault-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <span className="vault-ext-badge" style={{ fontSize: '12px', padding: '6px 8px' }}>
              {file.extension.replace('.', '')}
            </span>
            <div style={{ minWidth: 0 }}>
              <h2
                id="file-detail-title"
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: 'var(--ink)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '480px',
                }}
              >
                {file.displayName}
              </h2>
              <div style={{ color: 'var(--muted)', fontSize: '11px', marginTop: '1px' }}>
                {file.originalFilename}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button
              type="button"
              className="button button-secondary"
              style={{ height: '32px', fontSize: '12px', gap: '6px' }}
              onClick={handleDownload}
              disabled={isDownloading}
              title="Download file"
            >
              <Download size={13} />
              <span>{isDownloading ? 'Downloading…' : 'Download'}</span>
            </button>

            <button
              type="button"
              className="button button-secondary"
              style={{ height: '32px', padding: '0 10px', color: '#e11d48' }}
              onClick={handleDelete}
              disabled={isDeleting}
              title="Move file to trash"
            >
              <Trash2 size={14} />
            </button>

            <button
              type="button"
              className="row-action-button"
              aria-label="Close dialog"
              onClick={onClose}
              style={{ width: '32px', height: '32px' }}
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Form Wrap */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          {/* Main Content: Left Preview & Right Details */}
          <div className="vault-detail-modal-layout">
            {/* Left Preview */}
            <div className="vault-detail-preview-panel">
              {canPreview ? (
                isPdf ? (
                  <iframe
                    src={fileUrl}
                    title={file.displayName}
                    style={{
                      width: '100%',
                      height: '100%',
                      minHeight: '480px',
                      border: 'none',
                      borderRadius: '8px',
                      background: '#ffffff',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                    }}
                  />
                ) : isImage ? (
                  <img
                    src={fileUrl}
                    alt={file.displayName}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '460px',
                      objectFit: 'contain',
                      borderRadius: '8px',
                      boxShadow: '0 4px 18px rgba(0,0,0,0.1)',
                    }}
                  />
                ) : (
                  <iframe
                    src={fileUrl}
                    title={file.displayName}
                    style={{
                      width: '100%',
                      height: '100%',
                      minHeight: '420px',
                      border: '1px solid var(--line)',
                      borderRadius: '8px',
                      background: '#ffffff',
                      padding: '12px',
                    }}
                  />
                )
              ) : (
                <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--muted)' }}>
                  <FileText size={52} style={{ opacity: 0.35, margin: '0 auto 14px' }} />
                  <p style={{ fontWeight: 650, color: 'var(--ink)', fontSize: '14px', margin: 0 }}>
                    Inline preview not supported for {file.extension.toUpperCase()}
                  </p>
                  <p style={{ fontSize: '12px', margin: '6px 0 18px', color: 'var(--muted)' }}>
                    Download the file to inspect its full contents locally.
                  </p>
                  <button
                    type="button"
                    className="button button-primary"
                    style={{ fontSize: '12px', margin: '0 auto' }}
                    onClick={handleDownload}
                    disabled={isDownloading}
                  >
                    <Download size={14} /> Download {file.extension.toUpperCase()} File
                  </button>
                </div>
              )}
            </div>

            {/* Right Details Panel */}
            <div className="vault-detail-sidebar">
              {errorMessage && (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: '#fef2f2',
                    color: '#991b1b',
                    fontSize: '12px',
                    border: '1px solid #fecaca',
                  }}
                >
                  {errorMessage}
                </div>
              )}

              {/* 1. Category */}
              <div className="vault-form-field">
                <label className="vault-field-label" htmlFor="detail-category">
                  Document Category
                </label>
                <select
                  id="detail-category"
                  className="vault-select-full"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as VaultFileCategory)}
                >
                  <option value="RESUME">Resume</option>
                  <option value="JOB_DESCRIPTION">Job Description</option>
                  <option value="COVER_LETTER">Cover Letter</option>
                  <option value="PORTFOLIO">Portfolio</option>
                  <option value="CERTIFICATE">Certificate</option>
                  <option value="SUPPORTING_DOCUMENT">Supporting Document</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {/* 2. Display Name */}
              <div className="vault-form-field">
                <label className="vault-field-label" htmlFor="detail-display-name">
                  Display Name
                </label>
                <input
                  id="detail-display-name"
                  className="vault-input"
                  value={displayName}
                  placeholder="e.g. Senior Frontend Resume 2026"
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>

              {/* 3. Description */}
              <div className="vault-form-field">
                <label className="vault-field-label" htmlFor="detail-description">
                  Description / Notes
                </label>
                <textarea
                  id="detail-description"
                  className="vault-textarea"
                  rows={3}
                  value={description}
                  placeholder="Notes, tailored highlights, or version context..."
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* 4. Tags */}
              <div className="vault-form-field">
                <label className="vault-field-label" htmlFor="detail-tags">
                  Tags (comma-separated)
                </label>
                <input
                  id="detail-tags"
                  className="vault-input"
                  value={tags}
                  placeholder="React, TypeScript, Staff Engineer"
                  onChange={(e) => setTags(e.target.value)}
                />
              </div>

              {/* 5. Company Association */}
              <div className="vault-form-field">
                <label className="vault-field-label" htmlFor="detail-company" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building2 size={13} style={{ color: 'var(--muted)' }} /> Company Association
                </label>
                <select
                  id="detail-company"
                  className="vault-select-full"
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                >
                  <option value="">(None - Not linked to a company)</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 6. Application Association */}
              <div className="vault-form-field">
                <label className="vault-field-label" htmlFor="detail-application" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <BriefcaseBusiness size={13} style={{ color: 'var(--muted)' }} /> Application Association
                </label>
                <select
                  id="detail-application"
                  className="vault-select-full"
                  value={applicationId}
                  onChange={(e) => setApplicationId(e.target.value)}
                >
                  <option value="">(None - Not linked to an application)</option>
                  {applications.map((a) => {
                    const comp = companies.find((c) => c.id === a.companyId)
                    return (
                      <option key={a.id} value={a.id}>
                        {a.jobTitle} {comp ? `(${comp.name})` : ''}
                      </option>
                    )
                  })}
                </select>
              </div>

              {/* Metadata Section */}
              <div className="vault-metadata-card">
                <div style={{ fontWeight: 650, color: 'var(--ink)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '2px' }}>
                  File Metadata
                </div>
                <div className="vault-metadata-row">
                  <span className="vault-metadata-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <HardDrive size={12} /> File Size
                  </span>
                  <span className="vault-metadata-value">{formatBytes(file.fileSizeBytes)}</span>
                </div>
                <div className="vault-metadata-row">
                  <span className="vault-metadata-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Calendar size={12} /> Upload Date
                  </span>
                  <span className="vault-metadata-value">
                    {new Date(file.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <div className="vault-metadata-row">
                  <span className="vault-metadata-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Clock size={12} /> Upload Time
                  </span>
                  <span className="vault-metadata-value">
                    {new Date(file.createdAt).toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="vault-metadata-row">
                  <span className="vault-metadata-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <FileType size={12} /> MIME Type
                  </span>
                  <span className="vault-metadata-value">{file.mimeType}</span>
                </div>
                <div className="vault-metadata-row">
                  <span className="vault-metadata-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Tag size={12} /> Original Name
                  </span>
                  <span className="vault-metadata-value">{file.originalFilename}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="vault-modal-footer">
            <button
              type="button"
              className="button button-secondary"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button button-primary"
              disabled={isSaving || !displayName.trim()}
              style={{ minWidth: '110px' }}
            >
              <Check size={14} />
              <span>{isSaving ? 'Saving…' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
