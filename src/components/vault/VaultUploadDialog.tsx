import { useState, useRef, type FormEvent, type DragEvent } from 'react'
import { UploadCloud, X, AlertCircle } from 'lucide-react'
import { vaultApi } from '../../lib/vaultApi'
import { useAuth } from '../../context/auth-context'
import { useCareerData } from '../../context/useCareerData'
import type { VaultFile, VaultFileCategory } from '../../types'

interface VaultUploadDialogProps {
  initialCategory?: VaultFileCategory
  initialCompanyId?: string
  initialApplicationId?: string
  onClose: () => void
  onSuccess: (file: VaultFile) => void
}

export function VaultUploadDialog({
  initialCategory = 'OTHER',
  initialCompanyId,
  initialApplicationId,
  onClose,
  onSuccess,
}: VaultUploadDialogProps) {
  const auth = useAuth()
  const { data } = useCareerData()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [category, setCategory] = useState<VaultFileCategory>(initialCategory)
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [companyId, setCompanyId] = useState(initialCompanyId || '')
  const [applicationId, setApplicationId] = useState(initialApplicationId || '')
  const [isDragging, setIsDragging] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const token = auth.session?.access_token

  const handleFile = (file: File) => {
    setSelectedFile(file)
    if (!displayName) {
      // Pre-fill displayName with clean filename without extension
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ')
      setDisplayName(nameWithoutExt)
    }

    // Auto-detect category from filename if currently OTHER
    const lower = file.name.toLowerCase()
    if (category === 'OTHER' || initialCategory === 'OTHER') {
      if (lower.includes('resume') || lower.includes('cv')) {
        setCategory('RESUME')
      } else if (lower.includes('job') || lower.includes('description') || lower.includes('jd')) {
        setCategory('JOB_DESCRIPTION')
      } else if (lower.includes('cover')) {
        setCategory('COVER_LETTER')
      } else if (lower.includes('portfolio')) {
        setCategory('PORTFOLIO')
      } else if (lower.includes('cert')) {
        setCategory('CERTIFICATE')
      }
    }
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedFile) {
      setErrorMessage('Please select a file to upload.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean)
      const uploaded = await vaultApi.uploadFile(selectedFile, {
        displayName: displayName.trim() || selectedFile.name,
        category,
        description: description.trim() || undefined,
        tags: tagList,
        companyId: companyId || undefined,
        applicationId: applicationId || undefined,
        token,
      })

      onSuccess(uploaded)
      onClose()
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to upload file.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="vault-modal-scrim" onClick={(e) => e.target === e.currentTarget && !isSubmitting && onClose()}>
      <div className="vault-modal" role="dialog" aria-modal="true" aria-labelledby="upload-dialog-title">
        <div className="vault-modal-header">
          <div>
            <h2 id="upload-dialog-title">Upload to Vault</h2>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
              Files are securely encrypted and privately stored in your career vault.
            </div>
          </div>
          <button
            type="button"
            className="row-action-button"
            aria-label="Close"
            onClick={onClose}
            disabled={isSubmitting}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="vault-modal-body">
            {errorMessage && (
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
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Dropzone */}
            <div
              className={`vault-dropzone ${isDragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="vault-dropzone-icon">
                <UploadCloud size={24} />
              </div>
              {selectedFile ? (
                <div>
                  <strong style={{ color: 'var(--ink)', fontSize: '13px' }}>{selectedFile.name}</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--muted)' }}>
                    {(selectedFile.size / 1024).toFixed(1)} KB — Click or drop another file to change
                  </p>
                </div>
              ) : (
                <div>
                  <p style={{ margin: 0, fontWeight: 600, color: 'var(--ink)', fontSize: '13px' }}>
                    Click to upload or drag and drop
                  </p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--muted)' }}>
                    PDF, DOCX, DOC, TXT, PNG, JPG, WEBP (Up to 20 MB)
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>

            {/* Category */}
            <div className="vault-form-field">
              <label className="vault-field-label" htmlFor="upload-category">
                Document Category <span style={{ color: 'var(--accent)' }}>*</span>
              </label>
              <select
                id="upload-category"
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

            {/* Display Name */}
            <div className="vault-form-field">
              <label className="vault-field-label" htmlFor="upload-display-name">
                Display Name
              </label>
              <input
                id="upload-display-name"
                className="vault-input"
                value={displayName}
                placeholder="e.g. Frontend Lead Resume (2026)"
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="vault-form-field">
              <label className="vault-field-label" htmlFor="upload-description">
                Description / Notes
              </label>
              <textarea
                id="upload-description"
                className="vault-textarea"
                rows={2}
                value={description}
                placeholder="Optional notes or context about this document..."
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Tags */}
            <div className="vault-form-field">
              <label className="vault-field-label" htmlFor="upload-tags">
                Tags (comma-separated)
              </label>
              <input
                id="upload-tags"
                className="vault-input"
                value={tags}
                placeholder="Resume, Staff Role, Q1 Target"
                onChange={(e) => setTags(e.target.value)}
              />
            </div>

            {/* Associations */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div className="vault-form-field">
                <label className="vault-field-label" htmlFor="upload-company">
                  Link to Company
                </label>
                <select
                  id="upload-company"
                  className="vault-select-full"
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                >
                  <option value="">(None)</option>
                  {data?.companies?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="vault-form-field">
                <label className="vault-field-label" htmlFor="upload-application">
                  Link to Application
                </label>
                <select
                  id="upload-application"
                  className="vault-select-full"
                  value={applicationId}
                  onChange={(e) => setApplicationId(e.target.value)}
                >
                  <option value="">(None)</option>
                  {data?.applications?.map((a) => {
                    const comp = data.companies?.find((c) => c.id === a.companyId)
                    return (
                      <option key={a.id} value={a.id}>
                        {a.jobTitle} {comp ? `(${comp.name})` : ''}
                      </option>
                    )
                  })}
                </select>
              </div>
            </div>
          </div>

          <div className="vault-modal-footer">
            <button
              type="button"
              className="button button-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button button-primary"
              disabled={isSubmitting || !selectedFile}
              style={{ minWidth: '110px' }}
            >
              {isSubmitting ? 'Uploading…' : 'Upload File'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
