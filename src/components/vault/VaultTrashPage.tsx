import { useState, useEffect } from 'react'
import { Trash2, RotateCcw, AlertTriangle } from 'lucide-react'
import { vaultApi } from '../../lib/vaultApi'
import { useAuth } from '../../context/auth-context'
import type { VaultFile } from '../../types'

export function VaultTrashPage() {
  const auth = useAuth()
  const token = auth.session?.access_token

  const [trashedFiles, setTrashedFiles] = useState<VaultFile[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadTrash = async () => {
    setIsLoading(true)
    try {
      const res = await vaultApi.getFiles({ status: 'TRASHED', token })
      setTrashedFiles(res.files)
    } catch (err) {
      console.error('Failed to load trash', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTrash()
  }, [token])

  const handleRestore = async (file: VaultFile) => {
    try {
      await vaultApi.restoreFile(file.id, token)
      setTrashedFiles((prev) => prev.filter((f) => f.id !== file.id))
    } catch (err: any) {
      alert(err.message || 'Failed to restore file')
    }
  }

  const handlePermanentDelete = async (file: VaultFile) => {
    if (
      !window.confirm(
        `Permanently delete "${file.displayName}"? This will erase the file from storage and cannot be undone.`,
      )
    ) {
      return
    }

    try {
      await vaultApi.deleteFile(file.id, true, true, token)
      setTrashedFiles((prev) => prev.filter((f) => f.id !== file.id))
    } catch (err: any) {
      alert(err.message || 'Failed to permanently delete file')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div
        style={{
          padding: '14px 18px',
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: 'var(--ink)',
          fontSize: '13px',
        }}
      >
        <AlertTriangle size={18} style={{ color: '#d97706', flexShrink: 0 }} />
        <span>Items in trash do not consume active user quota and can be restored anytime before permanent deletion.</span>
      </div>

      {isLoading ? (
        <div className="directory-empty" style={{ padding: '32px' }}>Loading trash items…</div>
      ) : trashedFiles.length > 0 ? (
        <div className="vault-table-container">
          <table className="vault-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Category</th>
                <th>Deleted On</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {trashedFiles.map((file) => (
                <tr key={file.id}>
                  <td>
                    <div className="vault-file-title-cell">
                      <span className="vault-ext-badge">{file.extension.replace('.', '')}</span>
                      <div>
                        <strong style={{ color: 'var(--ink)' }}>{file.displayName}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{file.originalFilename}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`vault-badge ${file.category.toLowerCase()}`}>
                      {file.category.replace('_', ' ')}
                    </span>
                  </td>
                  <td>{file.deletedAt ? new Date(file.deletedAt).toLocaleDateString() : '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      <button
                        className="button button-secondary"
                        style={{ height: '30px', fontSize: '11px', padding: '0 10px' }}
                        onClick={() => handleRestore(file)}
                      >
                        <RotateCcw size={12} /> Restore
                      </button>
                      <button
                        className="row-delete-button"
                        title="Permanently Delete"
                        onClick={() => handlePermanentDelete(file)}
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
        <div className="directory-empty" style={{ padding: '48px 24px' }}>
          <Trash2 size={36} style={{ color: 'var(--subtle)', margin: '0 auto 10px' }} />
          <h3>Trash is Empty</h3>
          <p>Files you remove from your Vault will appear here before permanent deletion.</p>
        </div>
      )}
    </div>
  )
}
