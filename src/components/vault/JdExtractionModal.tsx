import { useState } from 'react'
import { Sparkles, Check, X, AlertCircle, CheckCircle2 } from 'lucide-react'
import { intelligenceApi } from '../../lib/intelligenceApi'
import type { ExtractedJDData } from '../../lib/intelligence/types'

interface JdExtractionModalProps {
  initialText?: string
  vaultFileId?: string
  onApply: (data: {
    title: string
    company?: string
    location?: string
    employmentType?: string
    workArrangement?: string
    experienceRequirements?: string
    salary?: string
    requiredSkills: string[]
    preferredSkills: string[]
    responsibilities?: string
    rawText: string
  }) => void
  onClose: () => void
}

export function JdExtractionModal({
  initialText = '',
  vaultFileId,
  onApply,
  onClose,
}: JdExtractionModalProps) {
  const [inputText, setInputText] = useState(initialText)
  const [fileToUpload, setFileToUpload] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [extractedData, setExtractedData] = useState<ExtractedJDData | null>(null)

  // Editable confirmed fields
  const [confirmedTitle, setConfirmedTitle] = useState('')
  const [confirmedCompany, setConfirmedCompany] = useState('')
  const [confirmedLocation, setConfirmedLocation] = useState('')
  const [confirmedEmpType, setConfirmedEmpType] = useState('')
  const [confirmedSalary, setConfirmedSalary] = useState('')
  const [confirmedReqSkills, setConfirmedReqSkills] = useState<string[]>([])
  const [confirmedPrefSkills, setConfirmedPrefSkills] = useState<string[]>([])
  const [confirmedResponsibilities, setConfirmedResponsibilities] = useState('')
  const [newSkillInput, setNewSkillInput] = useState('')

  const handleExtract = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await intelligenceApi.extractJd({
        file: fileToUpload || undefined,
        text: !fileToUpload ? inputText : undefined,
        vaultFileId: !fileToUpload && !inputText.trim() ? vaultFileId : undefined,
      })

      if (!response.ok || response.data.extractionStatus === 'EMPTY' || response.data.extractionStatus === 'UNSUPPORTED') {
        setError(response.data.statusMessage || 'Unable to extract content from document.')
        setLoading(false)
        return
      }

      const d = response.data
      setExtractedData(d)

      // Initialize confirmed fields
      setConfirmedTitle(d.jobTitle?.value || '')
      setConfirmedCompany(d.companyName?.value || '')
      setConfirmedLocation(d.location?.value || '')
      setConfirmedEmpType(d.employmentType?.value || '')
      setConfirmedSalary(d.salary?.value || '')
      setConfirmedReqSkills(d.requiredSkills.map((s) => s.name))
      setConfirmedPrefSkills(d.preferredSkills.map((s) => s.name))
      setConfirmedResponsibilities(d.responsibilities?.value ? d.responsibilities.value.join('\n') : '')
    } catch (err: any) {
      setError(err.message || 'Failed to extract job description details.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddSkill = (isRequired: boolean) => {
    if (!newSkillInput.trim()) return
    const val = newSkillInput.trim()
    if (isRequired) {
      if (!confirmedReqSkills.includes(val)) setConfirmedReqSkills([...confirmedReqSkills, val])
    } else {
      if (!confirmedPrefSkills.includes(val)) setConfirmedPrefSkills([...confirmedPrefSkills, val])
    }
    setNewSkillInput('')
  }

  const handleRemoveSkill = (skill: string, isRequired: boolean) => {
    if (isRequired) {
      setConfirmedReqSkills(confirmedReqSkills.filter((s) => s !== skill))
    } else {
      setConfirmedPrefSkills(confirmedPrefSkills.filter((s) => s !== skill))
    }
  }

  const handleApply = () => {
    onApply({
      title: confirmedTitle,
      company: confirmedCompany,
      location: confirmedLocation,
      employmentType: confirmedEmpType,
      salary: confirmedSalary,
      requiredSkills: confirmedReqSkills,
      preferredSkills: confirmedPrefSkills,
      responsibilities: confirmedResponsibilities,
      rawText: extractedData?.rawText || inputText,
    })
    onClose()
  }

  return (
    <div className="vault-modal-overlay" style={{ zIndex: 1100 }}>
      <div
        className="vault-modal-card"
        style={{ maxWidth: '780px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="vault-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} style={{ color: 'var(--accent)' }} />
            <h3 style={{ margin: 0, fontSize: '16px' }}>Smart JD Extraction Engine</h3>
          </div>
          <button type="button" className="row-action-button" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '16px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '6px',
                background: '#fee2e2',
                color: '#b91c1c',
                fontSize: '12px',
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {!extractedData ? (
            /* Input Phase */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
                Extract title, company, requirements, and technical skills deterministically from job description text or document files (.pdf, .docx, .txt).
              </p>

              <div>
                <label className="vault-field-label">Upload JD File (.pdf, .docx, .txt)</label>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  className="vault-input"
                  style={{ fontSize: '12px', padding: '6px' }}
                  onChange={(e) => setFileToUpload(e.target.files?.[0] || null)}
                />
              </div>

              <div>
                <label className="vault-field-label">Or Paste Job Description Text</label>
                <textarea
                  className="vault-input"
                  rows={8}
                  placeholder="Paste complete job description requirements here..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: '12px' }}
                />
              </div>

              <button
                type="button"
                className="button button-primary"
                disabled={loading || (!inputText.trim() && !fileToUpload && !vaultFileId)}
                onClick={handleExtract}
                style={{ alignSelf: 'flex-start', marginTop: '4px' }}
              >
                <Sparkles size={14} />
                {loading ? 'Extracting Technical Details...' : 'Extract JD Details'}
              </button>
            </div>
          ) : (
            /* Review & Confirm Phase */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  fontSize: '12px',
                }}
              >
                <CheckCircle2 size={16} style={{ color: 'var(--accent)' }} />
                <span>Extracted details ready for review. Verify and adjust values before applying to your workspace.</span>
              </div>

              {/* Form Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="vault-field-label">Target Job Title</label>
                  <input
                    type="text"
                    className="vault-input"
                    value={confirmedTitle}
                    onChange={(e) => setConfirmedTitle(e.target.value)}
                  />
                  {extractedData.jobTitle?.confidence && (
                    <span style={{ fontSize: '10px', color: 'var(--muted)' }}>Confidence: {Math.round(extractedData.jobTitle.confidence * 100)}% ({extractedData.jobTitle.method})</span>
                  )}
                </div>

                <div>
                  <label className="vault-field-label">Company Name</label>
                  <input
                    type="text"
                    className="vault-input"
                    value={confirmedCompany}
                    onChange={(e) => setConfirmedCompany(e.target.value)}
                  />
                  {extractedData.companyName?.confidence && (
                    <span style={{ fontSize: '10px', color: 'var(--muted)' }}>Confidence: {Math.round(extractedData.companyName.confidence * 100)}% ({extractedData.companyName.method})</span>
                  )}
                </div>

                <div>
                  <label className="vault-field-label">Location</label>
                  <input
                    type="text"
                    className="vault-input"
                    value={confirmedLocation}
                    onChange={(e) => setConfirmedLocation(e.target.value)}
                  />
                </div>

                <div>
                  <label className="vault-field-label">Employment Type / Arrangement</label>
                  <input
                    type="text"
                    className="vault-input"
                    value={confirmedEmpType}
                    onChange={(e) => setConfirmedEmpType(e.target.value)}
                  />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label className="vault-field-label">Salary / Compensation</label>
                  <input
                    type="text"
                    className="vault-input"
                    value={confirmedSalary}
                    onChange={(e) => setConfirmedSalary(e.target.value)}
                  />
                </div>
              </div>

              {/* Skills Review */}
              <div>
                <label className="vault-field-label" style={{ fontWeight: 600 }}>Required Technical Skills ({confirmedReqSkills.length})</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {confirmedReqSkills.map((skill) => (
                    <span
                      key={skill}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: 'rgba(99, 102, 241, 0.12)',
                        color: 'var(--accent)',
                        fontSize: '11px',
                        fontWeight: 500,
                      }}
                    >
                      {skill}
                      <X
                        size={12}
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleRemoveSkill(skill, true)}
                      />
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="vault-field-label" style={{ fontWeight: 600 }}>Preferred Skills ({confirmedPrefSkills.length})</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {confirmedPrefSkills.map((skill) => (
                    <span
                      key={skill}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: 'var(--surface-muted)',
                        color: 'var(--ink)',
                        fontSize: '11px',
                      }}
                    >
                      {skill}
                      <X
                        size={12}
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleRemoveSkill(skill, false)}
                      />
                    </span>
                  ))}
                </div>
              </div>

              {/* Add Custom Skill */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Add custom skill..."
                  className="vault-input"
                  style={{ maxWidth: '240px', fontSize: '11px' }}
                  value={newSkillInput}
                  onChange={(e) => setNewSkillInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill(true))}
                />
                <button
                  type="button"
                  className="button button-secondary"
                  style={{ fontSize: '11px', height: '30px' }}
                  onClick={() => handleAddSkill(true)}
                >
                  + Add as Required
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  style={{ fontSize: '11px', height: '30px' }}
                  onClick={() => handleAddSkill(false)}
                >
                  + Add as Preferred
                </button>
              </div>

              {/* Responsibilities */}
              <div>
                <label className="vault-field-label">Key Responsibilities</label>
                <textarea
                  className="vault-input"
                  rows={4}
                  value={confirmedResponsibilities}
                  onChange={(e) => setConfirmedResponsibilities(e.target.value)}
                  style={{ fontSize: '12px' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="vault-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 16px', borderTop: '1px solid var(--line)' }}>
          <button type="button" className="button button-secondary" onClick={onClose}>
            Cancel
          </button>
          {extractedData && (
            <button type="button" className="button button-primary" onClick={handleApply}>
              <Check size={14} /> Apply to Job Description
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
