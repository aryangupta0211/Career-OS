import { useState, useEffect } from 'react'
import { Search, FileText, Building2, Briefcase } from 'lucide-react'
import { intelligenceApi } from '../../lib/intelligenceApi'
import { vaultApi } from '../../lib/vaultApi'
import type { DocumentSearchResultItem } from '../../lib/intelligence/types'
import type { VaultFile } from '../../types'
import { VaultFileDetailModal } from './VaultFileDetailModal'

export function VaultSearchSection() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('ALL')
  const [results, setResults] = useState<DocumentSearchResultItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<VaultFile | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch()
    }, 250)
    return () => clearTimeout(timer)
  }, [query, category])

  const handleSearch = async () => {
    if (!query.trim() && category === 'ALL') {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const response = await intelligenceApi.searchDocuments({
        query: query.trim(),
        category: category !== 'ALL' ? category : undefined,
      })
      setResults(response.items || [])
    } catch (err) {
      console.error('Search error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenFile = async (fileId: string) => {
    try {
      const file = await vaultApi.getFile(fileId)
      setSelectedFile(file)
    } catch (err) {
      console.error('Failed to load file details:', err)
    }
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      {/* Search Bar & Category Filter */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderRadius: '6px',
            background: 'var(--surface)',
            border: '1px solid var(--line)',
          }}
        >
          <Search size={15} style={{ color: 'var(--muted)' }} />
          <input
            type="text"
            placeholder="Search documents by filename, tags, or content inside files (e.g. 'React', 'Spring Boot', 'Kafka')..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              width: '100%',
              fontSize: '13px',
              color: 'var(--ink)',
            }}
          />
        </div>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="vault-input"
          style={{ width: '160px', height: '36px', fontSize: '12px' }}
        >
          <option value="ALL">All Categories</option>
          <option value="RESUME">Resumes</option>
          <option value="JOB_DESCRIPTION">Job Descriptions</option>
          <option value="COVER_LETTER">Cover Letters</option>
          <option value="PORTFOLIO">Portfolio</option>
          <option value="CERTIFICATE">Certificates</option>
          <option value="SUPPORTING_DOCUMENT">Supporting Docs</option>
        </select>
      </div>

      {/* Results Dropdown / Container */}
      {(results.length > 0 || loading || (query.trim() && !loading)) && (
        <div
          style={{
            marginTop: '8px',
            borderRadius: '8px',
            border: '1px solid var(--line)',
            background: 'var(--surface)',
            maxHeight: '380px',
            overflowY: 'auto',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          }}
        >
          {loading ? (
            <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--muted)' }}>
              Searching document metadata and extracted text...
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--muted)' }}>
              No documents matched "{query}".
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  padding: '8px 12px',
                  fontSize: '11px',
                  color: 'var(--muted)',
                  borderBottom: '1px solid var(--line)',
                  background: 'var(--surface-muted)',
                }}
              >
                Found {results.length} matching document{results.length === 1 ? '' : 's'}
              </div>

              {results.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleOpenFile(item.id)}
                  style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid var(--line)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-muted)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={15} style={{ color: 'var(--accent)' }} />
                      <strong style={{ fontSize: '12px', color: 'var(--ink)' }}>{item.displayName}</strong>
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: 'rgba(99, 102, 241, 0.1)',
                          color: 'var(--accent)',
                        }}
                      >
                        {item.category}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {item.matchHighlights.map((hl) => (
                        <span
                          key={hl}
                          style={{
                            fontSize: '10px',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: hl === 'Document Content' ? '#fef3c7' : 'var(--surface-muted)',
                            color: hl === 'Document Content' ? '#92400e' : 'var(--muted)',
                            fontWeight: hl === 'Document Content' ? 600 : 400,
                          }}
                        >
                          {hl}
                        </span>
                      ))}
                    </div>
                  </div>

                  {item.snippet && (
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--muted)',
                        background: 'rgba(0,0,0,0.02)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontStyle: 'italic',
                      }}
                    >
                      "{item.snippet}"
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '12px', fontSize: '10px', color: 'var(--muted)' }}>
                    {item.companyName && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Building2 size={11} /> {item.companyName}
                      </span>
                    )}
                    {item.jobTitle && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Briefcase size={11} /> {item.jobTitle}
                      </span>
                    )}
                    <span>{(item.fileSizeBytes / 1024).toFixed(1)} KB</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedFile && (
        <VaultFileDetailModal
          file={selectedFile}
          onClose={() => setSelectedFile(null)}
          onUpdate={(u) => setSelectedFile(u)}
          onDelete={() => {
            setSelectedFile(null)
            handleSearch()
          }}
        />
      )}
    </div>
  )
}
