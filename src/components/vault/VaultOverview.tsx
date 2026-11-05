import { useState, useEffect } from 'react'
import {
  UploadCloud,
  FileText,
  BriefcaseBusiness,
  HardDrive,
  RefreshCw,
  Eye,
  Download,
  Plus,
} from 'lucide-react'
import { vaultApi } from '../../lib/vaultApi'
import { useAuth } from '../../context/auth-context'
import type { ResumeGroup, StorageSummary, VaultFile, JobDescription } from '../../types'
import { VaultFileDetailModal } from './VaultFileDetailModal'

interface VaultOverviewProps {
  onNavigateTab: (tab: 'resumes' | 'jobs' | 'all' | 'trash') => void
  onOpenUpload: () => void
  onOpenNewResumeGroup: () => void
  onOpenNewJobDescription?: () => void
}

export function VaultOverview({
  onNavigateTab,
  onOpenUpload,
  onOpenNewResumeGroup,
}: VaultOverviewProps) {
  const auth = useAuth()
  const token = auth.session?.access_token

  const [storage, setStorage] = useState<StorageSummary | null>(null)
  const [recentFiles, setRecentFiles] = useState<VaultFile[]>([])
  const [resumeGroups, setResumeGroups] = useState<ResumeGroup[]>([])
  const [jobDescriptions, setJobDescriptions] = useState<JobDescription[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isReconciling, setIsReconciling] = useState(false)
  const [activeFile, setActiveFile] = useState<VaultFile | null>(null)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [storageRes, filesRes, resumesRes, jdsRes] = await Promise.all([
        vaultApi.getStorageSummary(token),
        vaultApi.getFiles({ limit: 6, sortBy: 'recently_uploaded', token }),
        vaultApi.getResumeGroups(false, token),
        vaultApi.getJobDescriptions(token),
      ])
      setStorage(storageRes)
      setRecentFiles(filesRes.files)
      setResumeGroups(resumesRes)
      setJobDescriptions(jdsRes.slice(0, 4))
    } catch (err) {
      console.error('Failed to load Vault overview data', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [token])

  const handleReconcile = async () => {
    setIsReconciling(true)
    try {
      const result = await vaultApi.reconcileStorage(token)
      setStorage(result.summary)
    } catch (err) {
      console.error('Reconciliation failed', err)
    } finally {
      setIsReconciling(false)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const mb = bytes / (1024 * 1024)
    if (mb < 1) return `${(bytes / 1024).toFixed(1)} KB`
    return `${mb.toFixed(1)} MB`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Storage Summary Banner */}
      <div className="vault-storage-banner">
        <div className="vault-storage-info">
          <div className="vault-storage-title">
            <HardDrive size={18} style={{ color: 'var(--accent)' }} />
            <span>Vault Storage Allowance</span>
          </div>

          <div className="vault-progress-track">
            <div
              className={`vault-progress-bar ${(storage?.usagePercentage || 0) > 85 ? 'danger' : (storage?.usagePercentage || 0) > 70 ? 'warning' : ''}`}
              style={{ width: `${storage?.usagePercentage || 0}%` }}
            />
          </div>

          <div className="vault-storage-stats">
            <span>
              <strong>{formatBytes(storage?.usedBytes || 0)}</strong> of {formatBytes(storage?.totalQuotaBytes || 0)} used ({storage?.usagePercentage || 0}%)
            </span>
            <span>•</span>
            <span><strong>{storage?.fileCount || 0}</strong> active career files</span>
            <span>•</span>
            <span>Max single upload: {formatBytes(storage?.maxFileSizeBytes || 20971520)}</span>
          </div>
        </div>

        <div className="vault-storage-actions">
          <button
            className="button button-secondary"
            style={{ fontSize: '12px', height: '34px' }}
            onClick={handleReconcile}
            disabled={isReconciling}
            title="Recalculate storage usage"
          >
            <RefreshCw size={13} className={isReconciling ? 'animate-spin' : ''} />
            <span>Reconcile</span>
          </button>
          <button className="button button-primary" style={{ fontSize: '12px', height: '34px' }} onClick={onOpenUpload}>
            <UploadCloud size={14} /> Upload File
          </button>
        </div>
      </div>

      {/* Quick Action Tiles */}
      <div className="vault-quick-grid">
        <div className="vault-action-card" onClick={onOpenUpload} style={{ cursor: 'pointer' }}>
          <div className="vault-action-icon">
            <UploadCloud size={20} />
          </div>
          <div>
            <h3>Upload Documents</h3>
            <p>Add PDFs, DOCX, certifications, cover letters, or portfolio artifacts.</p>
          </div>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)' }}>Upload new file →</span>
        </div>

        <div className="vault-action-card" onClick={() => onNavigateTab('resumes')} style={{ cursor: 'pointer' }}>
          <div className="vault-action-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
            <FileText size={20} />
          </div>
          <div>
            <h3>Resume Vault ({resumeGroups.length})</h3>
            <p>Maintain immutable version history tailored for specific job profiles.</p>
          </div>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#059669' }}>Manage versions →</span>
        </div>

        <div className="vault-action-card" onClick={() => onNavigateTab('jobs')} style={{ cursor: 'pointer' }}>
          <div className="vault-action-icon" style={{ background: '#fffbeb', color: '#d97706' }}>
            <BriefcaseBusiness size={20} />
          </div>
          <div>
            <h3>Job Descriptions ({jobDescriptions.length})</h3>
            <p>Save job specifications from pasted text or uploaded PDF postings.</p>
          </div>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#d97706' }}>Browse JD library →</span>
        </div>
      </div>

      {/* Resume Groups Spotlight */}
      <div className="panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>Targeted Resume Groups</h2>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
              Canonical resume variants organized with transactional version history.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="button button-secondary" style={{ height: '32px', fontSize: '12px' }} onClick={onOpenNewResumeGroup}>
              <Plus size={14} /> New Group
            </button>
            <button className="button button-secondary" style={{ height: '32px', fontSize: '12px' }} onClick={() => onNavigateTab('resumes')}>
              View All
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          {resumeGroups.map((group) => {
            const currentVer = group.versions.find((v) => v.isCurrent) || group.versions[0]
            return (
              <div
                key={group.id}
                style={{
                  border: '1px solid var(--line)',
                  borderRadius: '10px',
                  padding: '16px',
                  background: 'var(--surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <strong style={{ fontSize: '14px', color: 'var(--ink)' }}>{group.name}</strong>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--muted)' }}>{group.targetRole || 'General'}</p>
                  </div>
                  {currentVer && <span className="vault-badge current">{currentVer.versionLabel} (Active)</span>}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {group.skills.slice(0, 3).map((s) => (
                    <span key={s} className="skill-chip">{s}</span>
                  ))}
                  {group.skills.length > 3 && (
                    <span className="skill-chip">+{group.skills.length - 3}</span>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid var(--line)', fontSize: '11px', color: 'var(--muted)' }}>
                  <span>{group.versions.length} version{group.versions.length === 1 ? '' : 's'} recorded</span>
                  <button
                    className="row-action-button"
                    style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 600 }}
                    onClick={() => onNavigateTab('resumes')}
                  >
                    View Timeline
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent Files Table */}
      <div className="panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>Recent Uploads</h2>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
              Most recent career documents uploaded or updated.
            </p>
          </div>
          <button className="button button-secondary" style={{ height: '32px', fontSize: '12px' }} onClick={() => onNavigateTab('all')}>
            Browse All Documents
          </button>
        </div>

        {isLoading ? (
          <div className="directory-empty" style={{ padding: '32px' }}>Loading workspace documents…</div>
        ) : recentFiles.length > 0 ? (
          <div className="vault-table-container">
            <table className="vault-table">
              <thead>
                <tr>
                  <th>Document Name</th>
                  <th>Category</th>
                  <th>Size</th>
                  <th>Uploaded</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentFiles.map((file) => (
                  <tr key={file.id}>
                    <td>
                      <div className="vault-file-title-cell">
                        <span className="vault-ext-badge">{file.extension.replace('.', '')}</span>
                        <div>
                          <strong style={{ cursor: 'pointer', color: 'var(--ink)' }} onClick={() => setActiveFile(file)}>
                            {file.displayName}
                          </strong>
                          <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{file.originalFilename}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`vault-badge ${file.category.toLowerCase()}`}>
                        {file.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td>{formatBytes(file.fileSizeBytes)}</td>
                    <td>{new Date(file.createdAt).toLocaleDateString()}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          type="button"
                          className="row-action-button"
                          title="Preview document"
                          onClick={() => setActiveFile(file)}
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          className="row-action-button"
                          title="Download document"
                          onClick={() =>
                            vaultApi.downloadFile(file.id, file.originalFilename || file.displayName, token)
                          }
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="directory-empty" style={{ padding: '32px' }}>
            <FileText size={32} style={{ color: 'var(--subtle)', margin: '0 auto 8px' }} />
            <h3>Your Vault is empty</h3>
            <p>Upload resumes, job descriptions, or application documents to start organizing.</p>
            <button className="button button-primary" onClick={onOpenUpload}>
              <UploadCloud size={14} /> Upload First Document
            </button>
          </div>
        )}
      </div>

      {activeFile && (
        <VaultFileDetailModal
          file={activeFile}
          onClose={() => setActiveFile(null)}
          onUpdate={(updated) => {
            setActiveFile(updated)
            setRecentFiles((prev) => prev.map((f) => (f.id === updated.id ? updated : f)))
          }}
          onDelete={(id) => {
            setActiveFile(null)
            setRecentFiles((prev) => prev.filter((f) => f.id !== id))
          }}
        />
      )}
    </div>
  )
}
