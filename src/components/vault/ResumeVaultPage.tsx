import { useState, useEffect, useRef, type DragEvent } from 'react'
import {
  FileText,
  Plus,
  UploadCloud,
  CheckCircle2,
  Download,
  Eye,
  BriefcaseBusiness,
  Calendar,
  X,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import { vaultApi } from '../../lib/vaultApi'
import { useAuth } from '../../context/auth-context'
import type { ResumeGroup, VaultFile } from '../../types'
import { VaultFileDetailModal } from './VaultFileDetailModal'

export function ResumeVaultPage() {
  const auth = useAuth()
  const token = auth.session?.access_token

  const [groups, setGroups] = useState<ResumeGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [activeUploadGroupId, setActiveUploadGroupId] = useState<string | null>(null)
  const [activePreviewFile, setActivePreviewFile] = useState<VaultFile | null>(null)

  // New Group Form State
  const [groupName, setGroupName] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [groupSkills, setGroupSkills] = useState('')
  const [isSubmittingGroup, setIsSubmittingGroup] = useState(false)

  // Upload Version Form State
  const [versionFile, setVersionFile] = useState<File | null>(null)
  const [versionLabel, setVersionLabel] = useState('')
  const [versionDescription, setVersionDescription] = useState('')
  const [versionSkills, setVersionSkills] = useState('')
  const [isVersionCurrent, setIsVersionCurrent] = useState(true)
  const [isSubmittingVersion, setIsSubmittingVersion] = useState(false)
  const [versionError, setVersionError] = useState('')
  const [isDraggingVersion, setIsDraggingVersion] = useState(false)
  const versionFileInputRef = useRef<HTMLInputElement>(null)

  const loadResumeGroups = async () => {
    setIsLoading(true)
    try {
      const data = await vaultApi.getResumeGroups(false, token)
      setGroups(data)
    } catch (err) {
      console.error('Failed to load resume groups', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadResumeGroups()
  }, [token])

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupName.trim()) return
    setIsSubmittingGroup(true)
    try {
      const skills = groupSkills.split(',').map((s) => s.trim()).filter(Boolean)
      const created = await vaultApi.createResumeGroup(
        {
          name: groupName.trim(),
          targetRole: targetRole.trim() || undefined,
          description: groupDescription.trim() || undefined,
          skills,
        },
        token,
      )
      setGroups((prev) => [created, ...prev])
      setIsCreatingGroup(false)
      setGroupName('')
      setTargetRole('')
      setGroupDescription('')
      setGroupSkills('')
    } catch (err: any) {
      alert(err.message || 'Failed to create resume group')
    } finally {
      setIsSubmittingGroup(false)
    }
  }

  const handleUploadVersion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeUploadGroupId || !versionFile) {
      setVersionError('Please select a resume file (PDF preferred).')
      return
    }

    setIsSubmittingVersion(true)
    setVersionError('')

    try {
      const skills = versionSkills.split(',').map((s) => s.trim()).filter(Boolean)
      await vaultApi.uploadResumeVersion(
        activeUploadGroupId,
        versionFile,
        {
          versionLabel: versionLabel.trim() || undefined,
          description: versionDescription.trim() || undefined,
          skills,
          isCurrent: isVersionCurrent,
        },
        token,
      )

      await loadResumeGroups()
      setActiveUploadGroupId(null)
      setVersionFile(null)
      setVersionLabel('')
      setVersionDescription('')
      setVersionSkills('')
    } catch (err: any) {
      setVersionError(err.message || 'Failed to upload version')
    } finally {
      setIsSubmittingVersion(false)
    }
  }

  const handleSetCurrent = async (groupId: string, versionId: string) => {
    try {
      await vaultApi.setCurrentResumeVersion(groupId, versionId, token)
      setGroups((prev) =>
        prev.map((g) => {
          if (g.id !== groupId) return g
          return {
            ...g,
            versions: g.versions.map((v) => ({
              ...v,
              isCurrent: v.id === versionId,
            })),
          }
        }),
      )
    } catch (err: any) {
      alert(err.message || 'Failed to set current version')
    }
  }

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 B'
    const mb = bytes / (1024 * 1024)
    if (mb < 1) return `${(bytes / 1024).toFixed(1)} KB`
    return `${mb.toFixed(1)} MB`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>Resume Profiles & Versions</h2>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
            Each resume group contains immutable version snapshots. Applications remain pinned to their exact submitted version.
          </p>
        </div>
        <button className="button button-primary" onClick={() => setIsCreatingGroup(true)}>
          <Plus size={15} /> Create Resume Group
        </button>
      </div>

      {/* Group List */}
      {isLoading ? (
        <div className="directory-empty" style={{ padding: '48px 24px' }}>Loading resume profiles…</div>
      ) : groups.length > 0 ? (
        groups.map((group) => {
          const currentVer = group.versions.find((v) => v.isCurrent) || group.versions[0]
          return (
            <div key={group.id} className="resume-group-card">
              <div className="resume-group-header">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>{group.name}</h3>
                    {currentVer && (
                      <span className="vault-badge current">Current: {currentVer.versionLabel}</span>
                    )}
                  </div>
                  {group.targetRole && (
                    <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'var(--accent)', fontWeight: 600 }}>
                      Target: {group.targetRole}
                    </p>
                  )}
                  {group.description && (
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>{group.description}</p>
                  )}

                  {group.skills.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                      {group.skills.map((s) => (
                        <span key={s} className="skill-chip">{s}</span>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  className="button button-secondary"
                  style={{ height: '32px', fontSize: '12px' }}
                  onClick={() => {
                    setActiveUploadGroupId(group.id)
                    setVersionLabel(`v${((group.versions.length + 1) / 1.0).toFixed(1)}`)
                  }}
                >
                  <UploadCloud size={14} /> Upload New Version
                </button>
              </div>

              {/* Version History List */}
              <div className="resume-versions-timeline">
                {group.versions.map((ver) => (
                  <div key={ver.id} className="resume-version-row">
                    <div className="version-left">
                      <span className="vault-ext-badge">PDF</span>
                      <div className="version-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ fontSize: '13px', color: 'var(--ink)' }}>{ver.versionLabel}</strong>
                          {ver.isCurrent && (
                            <span className="vault-badge current" style={{ fontSize: '10px', padding: '1px 6px' }}>
                              Active
                            </span>
                          )}
                          <span style={{ fontSize: '11px', color: 'var(--subtle)' }}>
                            • {formatBytes(ver.vaultFile?.fileSizeBytes)}
                          </span>
                        </div>

                        {ver.description && (
                          <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                            {ver.description}
                          </p>
                        )}

                        <div className="version-meta">
                          <span>
                            <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} />
                            Uploaded: {new Date(ver.createdAt).toLocaleDateString()}
                          </span>

                          {ver.applicationDocuments && ver.applicationDocuments.length > 0 && (
                            <span>
                              <BriefcaseBusiness size={12} style={{ display: 'inline', marginRight: '4px' }} />
                              Used in {ver.applicationDocuments.length} application{ver.applicationDocuments.length === 1 ? '' : 's'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {!ver.isCurrent && (
                        <button
                          className="button button-secondary"
                          style={{ height: '30px', fontSize: '11px', padding: '0 10px' }}
                          onClick={() => handleSetCurrent(group.id, ver.id)}
                        >
                          <CheckCircle2 size={12} /> Make Current
                        </button>
                      )}

                      {ver.vaultFile && (
                        <>
                          <button
                            type="button"
                            className="row-action-button"
                            title="Preview version"
                            onClick={() => setActivePreviewFile(ver.vaultFile!)}
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            className="row-action-button"
                            title="Download version"
                            onClick={() =>
                              vaultApi.downloadFile(
                                ver.vaultFile!.id,
                                ver.vaultFile!.originalFilename || ver.vaultFile!.displayName,
                                token,
                              )
                            }
                          >
                            <Download size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })
      ) : (
        <div className="directory-empty" style={{ padding: '48px 24px' }}>
          <FileText size={36} style={{ color: 'var(--subtle)', margin: '0 auto 10px' }} />
          <h3>No Resume Groups Yet</h3>
          <p>Create tailored resume groups like "Frontend Developer" or "Full Stack Engineer" to maintain immutable version histories.</p>
          <button className="button button-primary" onClick={() => setIsCreatingGroup(true)}>
            <Plus size={14} /> Create First Group
          </button>
        </div>
      )}

      {/* Create Group Modal */}
      {isCreatingGroup && (
        <div className="vault-modal-scrim" onClick={(e) => e.target === e.currentTarget && setIsCreatingGroup(false)}>
          <div className="vault-modal" role="dialog" aria-modal="true" aria-labelledby="create-group-title">
            <div className="vault-modal-header">
              <div>
                <h2 id="create-group-title">Create Resume Group</h2>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                  Group resume versions tailored for specific roles or seniority levels.
                </div>
              </div>
              <button
                type="button"
                className="row-action-button"
                aria-label="Close"
                onClick={() => setIsCreatingGroup(false)}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateGroup} style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="vault-modal-body">
                <div className="vault-form-field">
                  <label className="vault-field-label" htmlFor="group-name-input">
                    Resume Group Name <span style={{ color: 'var(--accent)' }}>*</span>
                  </label>
                  <input
                    id="group-name-input"
                    className="vault-input"
                    required
                    placeholder="e.g. Senior Frontend Engineer"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                  />
                  <span className="vault-field-hint">A clear identifier for this resume variant.</span>
                </div>

                <div className="vault-form-field">
                  <label className="vault-field-label" htmlFor="group-target-input">
                    Target Role / Title
                  </label>
                  <input
                    id="group-target-input"
                    className="vault-input"
                    placeholder="e.g. Staff Software Engineer, Tech Lead"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                  />
                </div>

                <div className="vault-form-field">
                  <label className="vault-field-label" htmlFor="group-desc-input">
                    Description & Strategy
                  </label>
                  <textarea
                    id="group-desc-input"
                    className="vault-textarea"
                    rows={3}
                    placeholder="Describe how this resume variant is tailored (e.g. highlights systems architecture and scale)..."
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                  />
                </div>

                <div className="vault-form-field">
                  <label className="vault-field-label" htmlFor="group-skills-input">
                    Key Skills (comma-separated)
                  </label>
                  <input
                    id="group-skills-input"
                    className="vault-input"
                    placeholder="React, TypeScript, Next.js, Node.js, GraphQL"
                    value={groupSkills}
                    onChange={(e) => setGroupSkills(e.target.value)}
                  />
                  <span className="vault-field-hint">These skills are automatically indexed as search tags.</span>
                </div>
              </div>

              <div className="vault-modal-footer">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setIsCreatingGroup(false)}
                  disabled={isSubmittingGroup}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={isSubmittingGroup || !groupName.trim()}
                >
                  {isSubmittingGroup ? 'Creating…' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Version Modal */}
      {activeUploadGroupId && (
        <div
          className="vault-modal-scrim"
          onClick={(e) => e.target === e.currentTarget && !isSubmittingVersion && setActiveUploadGroupId(null)}
        >
          <div className="vault-modal" style={{ maxWidth: '640px' }} role="dialog" aria-modal="true" aria-labelledby="upload-version-title">
            <div className="vault-modal-header">
              <div>
                <h2 id="upload-version-title">Upload Resume Version</h2>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                  Each upload creates an immutable snapshot without overwriting previous versions.
                </div>
              </div>
              <button
                type="button"
                className="row-action-button"
                aria-label="Close"
                onClick={() => !isSubmittingVersion && setActiveUploadGroupId(null)}
                disabled={isSubmittingVersion}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUploadVersion} style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="vault-modal-body">
                {versionError && (
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
                    <span>{versionError}</span>
                  </div>
                )}

                {/* Drag & Drop File Selector */}
                <div className="vault-form-field">
                  <label className="vault-field-label">
                    Resume Document <span style={{ color: 'var(--accent)' }}>*</span>
                  </label>
                  <div
                    className={`vault-dropzone ${isDraggingVersion ? 'dragging' : ''}`}
                    onClick={() => versionFileInputRef.current?.click()}
                    onDragOver={(e: DragEvent) => {
                      e.preventDefault()
                      setIsDraggingVersion(true)
                    }}
                    onDragLeave={() => setIsDraggingVersion(false)}
                    onDrop={(e: DragEvent) => {
                      e.preventDefault()
                      setIsDraggingVersion(false)
                      if (e.dataTransfer.files?.[0]) {
                        setVersionFile(e.dataTransfer.files[0])
                        setVersionError('')
                      }
                    }}
                    style={{ padding: '24px 16px' }}
                  >
                    <div className="vault-dropzone-icon" style={{ width: '40px', height: '40px' }}>
                      <UploadCloud size={20} />
                    </div>
                    {versionFile ? (
                      <div>
                        <strong style={{ color: 'var(--ink)', fontSize: '13px' }}>{versionFile.name}</strong>
                        <p style={{ margin: '3px 0 0', fontSize: '11px', color: 'var(--muted)' }}>
                          {(versionFile.size / 1024).toFixed(1)} KB — Click or drop to replace
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p style={{ margin: 0, fontWeight: 600, color: 'var(--ink)', fontSize: '13px' }}>
                          Drag and drop your resume file, or <span style={{ color: 'var(--accent)' }}>browse</span>
                        </p>
                        <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--muted)' }}>
                          Supports PDF, DOCX, DOC (Up to 20 MB)
                        </p>
                      </div>
                    )}
                    <input
                      ref={versionFileInputRef}
                      type="file"
                      style={{ display: 'none' }}
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setVersionFile(e.target.files[0])
                          setVersionError('')
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Two Column Section on Wider Screens */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                  <div className="vault-form-field">
                    <label className="vault-field-label" htmlFor="version-label-input">
                      Version Label
                    </label>
                    <input
                      id="version-label-input"
                      className="vault-input"
                      value={versionLabel}
                      placeholder="e.g. v2.0 or 2026-Q1"
                      onChange={(e) => setVersionLabel(e.target.value)}
                    />
                    <span className="vault-field-hint">Defaults automatically if left blank.</span>
                  </div>

                  <div className="vault-form-field">
                    <label className="vault-field-label" htmlFor="version-skills-input">
                      Skills Highlighted
                    </label>
                    <input
                      id="version-skills-input"
                      className="vault-input"
                      value={versionSkills}
                      placeholder="React, TypeScript, GraphQL"
                      onChange={(e) => setVersionSkills(e.target.value)}
                    />
                    <span className="vault-field-hint">Comma-separated tags for this version.</span>
                  </div>
                </div>

                <div className="vault-form-field">
                  <label className="vault-field-label" htmlFor="version-desc-input">
                    Version Changes / Summary
                  </label>
                  <textarea
                    id="version-desc-input"
                    className="vault-textarea"
                    rows={2}
                    value={versionDescription}
                    placeholder="e.g. Added Q3 leadership accomplishments, updated metrics, and refined architecture section..."
                    onChange={(e) => setVersionDescription(e.target.value)}
                  />
                </div>

                <div
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: 'var(--surface-muted)',
                    border: '1px solid var(--line)',
                  }}
                >
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      fontWeight: 550,
                      color: 'var(--ink)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isVersionCurrent}
                      onChange={(e) => setIsVersionCurrent(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }}
                    />
                    <span>Set as the active / current version for this group</span>
                  </label>
                  <p style={{ margin: '4px 0 0 26px', fontSize: '11px', color: 'var(--muted)' }}>
                    Active versions are automatically recommended when attaching resumes to applications.
                  </p>
                </div>
              </div>

              <div className="vault-modal-footer">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => !isSubmittingVersion && setActiveUploadGroupId(null)}
                  disabled={isSubmittingVersion}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={isSubmittingVersion || !versionFile}
                  style={{ minWidth: '130px' }}
                >
                  <Sparkles size={14} />
                  <span>{isSubmittingVersion ? 'Uploading Version…' : 'Save Version'}</span>
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
          onUpdate={(updated) => setActivePreviewFile(updated)}
          onDelete={() => {
            setActivePreviewFile(null)
            loadResumeGroups()
          }}
        />
      )}
    </div>
  )
}
