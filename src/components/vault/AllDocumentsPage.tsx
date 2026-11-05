import { useState, useEffect } from 'react'
import {
  Search,
  LayoutList,
  LayoutGrid,
  Eye,
  Download,
  Trash2,
  FileText,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { vaultApi } from '../../lib/vaultApi'
import { useAuth } from '../../context/auth-context'
import type { VaultFile } from '../../types'
import { VaultFileDetailModal } from './VaultFileDetailModal'

interface AllDocumentsPageProps {
  onOpenUpload: () => void
}

export function AllDocumentsPage({ onOpenUpload }: AllDocumentsPageProps) {
  const auth = useAuth()
  const token = auth.session?.access_token

  const [files, setFiles] = useState<VaultFile[]>([])
  const [totalFiles, setTotalFiles] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [extensionFilter, setExtensionFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState('recently_uploaded')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [isLoading, setIsLoading] = useState(true)
  const [activeFile, setActiveFile] = useState<VaultFile | null>(null)

  const loadFiles = async () => {
    setIsLoading(true)
    try {
      const res = await vaultApi.getFiles({
        category: categoryFilter,
        extension: extensionFilter,
        search,
        page,
        limit: 20,
        sortBy,
        status: 'ACTIVE',
        token,
      })
      setFiles(res.files)
      setTotalFiles(res.pagination.total)
      setTotalPages(res.pagination.totalPages)
    } catch (err) {
      console.error('Failed to load files', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadFiles()
  }, [categoryFilter, extensionFilter, search, sortBy, page, token])

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const mb = bytes / (1024 * 1024)
    if (mb < 1) return `${(bytes / 1024).toFixed(1)} KB`
    return `${mb.toFixed(1)} MB`
  }

  const handleDelete = async (file: VaultFile) => {
    if (!window.confirm(`Move "${file.displayName}" to trash?`)) return
    try {
      await vaultApi.deleteFile(file.id, false, false, token)
      setFiles((prev) => prev.filter((f) => f.id !== file.id))
      setTotalFiles((prev) => Math.max(0, prev - 1))
    } catch (err: any) {
      alert(err.message || 'Failed to delete file.')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Toolbar */}
      <div className="vault-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div className="vault-search-box">
            <Search size={15} style={{ color: 'var(--subtle)' }} />
            <input
              placeholder="Search filename, tag, notes..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>

          <div className="vault-filters-group">
            <select
              className="vault-select"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value)
                setPage(1)
              }}
            >
              <option value="ALL">All Categories</option>
              <option value="RESUME">Resumes</option>
              <option value="JOB_DESCRIPTION">Job Descriptions</option>
              <option value="COVER_LETTER">Cover Letters</option>
              <option value="PORTFOLIO">Portfolio</option>
              <option value="CERTIFICATE">Certificates</option>
              <option value="SUPPORTING_DOCUMENT">Supporting Documents</option>
              <option value="OTHER">Other</option>
            </select>

            <select
              className="vault-select"
              value={extensionFilter}
              onChange={(e) => {
                setExtensionFilter(e.target.value)
                setPage(1)
              }}
            >
              <option value="ALL">All Formats</option>
              <option value=".pdf">PDF</option>
              <option value=".docx">DOCX</option>
              <option value=".doc">DOC</option>
              <option value=".txt">TXT</option>
              <option value=".png">PNG</option>
              <option value=".jpg">JPG</option>
              <option value=".webp">WEBP</option>
            </select>

            <select
              className="vault-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="recently_uploaded">Recently Uploaded</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Name (A-Z)</option>
              <option value="size_desc">File Size (Largest)</option>
              <option value="size_asc">File Size (Smallest)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'inline-flex', border: '1px solid var(--line)', borderRadius: '8px', overflow: 'hidden' }}>
            <button
              className="row-action-button"
              style={{
                borderRadius: 0,
                background: viewMode === 'list' ? 'var(--surface-muted)' : 'transparent',
                color: viewMode === 'list' ? 'var(--accent)' : 'var(--muted)',
              }}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <LayoutList size={16} />
            </button>
            <button
              className="row-action-button"
              style={{
                borderRadius: 0,
                background: viewMode === 'grid' ? 'var(--surface-muted)' : 'transparent',
                color: viewMode === 'grid' ? 'var(--accent)' : 'var(--muted)',
              }}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <LayoutGrid size={16} />
            </button>
          </div>

          <button className="button button-primary" style={{ height: '34px', fontSize: '12px' }} onClick={onOpenUpload}>
            <UploadCloud size={14} /> Upload
          </button>
        </div>
      </div>

      {/* Main Files View */}
      {isLoading ? (
        <div className="directory-empty" style={{ padding: '48px 24px' }}>Loading vault documents…</div>
      ) : files.length > 0 ? (
        viewMode === 'list' ? (
          <div className="vault-table-container">
            <table className="vault-table">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Category</th>
                  <th>Size</th>
                  <th>Associations</th>
                  <th>Uploaded</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.id}>
                    <td>
                      <div className="vault-file-title-cell">
                        <span className="vault-ext-badge">{file.extension.replace('.', '')}</span>
                        <div>
                          <strong
                            style={{ cursor: 'pointer', color: 'var(--ink)' }}
                            onClick={() => setActiveFile(file)}
                          >
                            {file.displayName}
                          </strong>
                          <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                            {file.originalFilename}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`vault-badge ${file.category.toLowerCase()}`}>
                        {file.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td>{formatBytes(file.fileSizeBytes)}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px', color: 'var(--muted)' }}>
                        {file.companyDocuments?.map((cd) => (
                          <span key={cd.id}>🏢 {cd.company?.name || 'Company'}</span>
                        ))}
                        {file.applicationDocuments?.map((ad) => (
                          <span key={ad.id}>💼 {ad.application?.jobTitle || 'Application'}</span>
                        ))}
                        {!file.companyDocuments?.length && !file.applicationDocuments?.length && (
                          <span style={{ color: 'var(--subtle)' }}>None</span>
                        )}
                      </div>
                    </td>
                    <td>{new Date(file.createdAt).toLocaleDateString()}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          type="button"
                          className="row-action-button"
                          title="Preview"
                          onClick={() => setActiveFile(file)}
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          className="row-action-button"
                          title="Download"
                          onClick={() =>
                            vaultApi.downloadFile(file.id, file.originalFilename || file.displayName, token)
                          }
                        >
                          <Download size={14} />
                        </button>
                        <button
                          className="row-delete-button"
                          title="Move to trash"
                          onClick={() => handleDelete(file)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="jd-grid">
            {files.map((file) => (
              <div key={file.id} className="jd-card" onClick={() => setActiveFile(file)} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span className="vault-ext-badge">{file.extension.replace('.', '')}</span>
                  <span className={`vault-badge ${file.category.toLowerCase()}`}>
                    {file.category.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <strong style={{ fontSize: '14px', color: 'var(--ink)' }}>{file.displayName}</strong>
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--muted)' }}>
                    {file.originalFilename}
                  </p>
                  {file.description && (
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--ink)', opacity: 0.85 }}>
                      {file.description}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--line)', paddingTop: '10px', fontSize: '11px', color: 'var(--muted)' }}>
                  <span>{formatBytes(file.fileSizeBytes)}</span>
                  <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="directory-empty" style={{ padding: '48px 24px' }}>
          <FileText size={36} style={{ color: 'var(--subtle)', margin: '0 auto 10px' }} />
          <h3>No documents found</h3>
          <p>
            {search || categoryFilter !== 'ALL' || extensionFilter !== 'ALL'
              ? 'Try clearing search filters or broadening your criteria.'
              : 'Add your resumes, job descriptions, or career documents to CareerOS Vault.'}
          </p>
          <button className="button button-primary" onClick={onOpenUpload}>
            <UploadCloud size={14} /> Upload First File
          </button>
        </div>
      )}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 4px' }}>
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
            Showing page {page} of {totalPages} ({totalFiles} files total)
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className="button button-secondary"
              style={{ height: '30px', padding: '0 8px' }}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <button
              className="button button-secondary"
              style={{ height: '30px', padding: '0 8px' }}
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {activeFile && (
        <VaultFileDetailModal
          file={activeFile}
          onClose={() => setActiveFile(null)}
          onUpdate={(updated) => {
            setActiveFile(updated)
            setFiles((prev) => prev.map((f) => (f.id === updated.id ? updated : f)))
          }}
          onDelete={(id) => {
            setActiveFile(null)
            setFiles((prev) => prev.filter((f) => f.id !== id))
            setTotalFiles((prev) => Math.max(0, prev - 1))
          }}
        />
      )}
    </div>
  )
}
