import { useState, useEffect } from 'react'
import {
  BriefcaseBusiness,
  Plus,
  Search,
  ExternalLink,
  Calendar,
  Building2,
  Trash2,
  FileText,
  Eye,
  Download,
  X,
  AlertCircle,
} from 'lucide-react'
import { vaultApi } from '../../lib/vaultApi'
import { useAuth } from '../../context/auth-context'
import { useCareerData } from '../../context/useCareerData'
import type { JobDescription, VaultFile } from '../../types'
import { VaultFileDetailModal } from './VaultFileDetailModal'
import { CompanySelectWithCreate } from '../CompanySelectWithCreate'

export function JobDescriptionsPage() {
  const auth = useAuth()
  const token = auth.session?.access_token
  const { data } = useCareerData()

  const [jds, setJds] = useState<JobDescription[]>([])
  const [search, setSearch] = useState('')
  const [selectedCompanyId, setSelectedCompanyId] = useState('ALL')
  const [isLoading, setIsLoading] = useState(true)
  const [isAddingJd, setIsAddingJd] = useState(false)
  const [selectedJdDetail, setSelectedJdDetail] = useState<JobDescription | null>(null)
  const [activePreviewFile, setActivePreviewFile] = useState<VaultFile | null>(null)

  // Form State
  const [title, setTitle] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [location, setLocation] = useState('')
  const [experienceLevel, setExperienceLevel] = useState('')
  const [employmentType] = useState('Full-time')
  const [sourceUrl, setSourceUrl] = useState('')
  const [careerPageUrl, setCareerPageUrl] = useState('')
  const [deadline, setDeadline] = useState('')
  const [responsibilities, setResponsibilities] = useState('')
  const [requiredSkills, setRequiredSkills] = useState('')
  const [preferredSkills, setPreferredSkills] = useState('')
  const [descriptionText, setDescriptionText] = useState('')
  const [notes, setNotes] = useState('')
  const [jdFile, setJdFile] = useState<File | null>(null)
  const [createApplication, setCreateApplication] = useState(false)
  const [appStatus, setAppStatus] = useState('Saved')
  const [resumeVersion, setResumeVersion] = useState('')
  const [resumeGroups, setResumeGroups] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const { addRecord } = useCareerData()

  useEffect(() => {
    vaultApi.getResumeGroups(false, token).then(setResumeGroups).catch(() => {})
  }, [token])

  const loadJds = async () => {
    setIsLoading(true)
    try {
      const data = await vaultApi.getJobDescriptions(token)
      setJds(data)
    } catch (err) {
      console.error('Failed to load job descriptions', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadJds()
  }, [token])

  const handleCreateJd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setIsSubmitting(true)
    setFormError('')

    try {
      const reqSkills = requiredSkills.split(',').map((s) => s.trim()).filter(Boolean)
      const prefSkills = preferredSkills.split(',').map((s) => s.trim()).filter(Boolean)

      const created = await vaultApi.createJobDescription(
        {
          title: title.trim(),
          companyId: companyId || null,
          location: location.trim() || null,
          experienceLevel: experienceLevel.trim() || null,
          employmentType: employmentType || null,
          sourceUrl: sourceUrl.trim() || null,
          careerPageUrl: careerPageUrl.trim() || null,
          applicationDeadline: deadline || null,
          responsibilities: responsibilities.trim() || null,
          requiredSkills: reqSkills,
          preferredSkills: prefSkills,
          descriptionText: descriptionText.trim() || null,
          notes: notes.trim() || null,
        },
        jdFile || undefined,
        token,
      )

      // If user opted to create linked application immediately
      if (createApplication) {
        const appId = `app-${Date.now()}`
        addRecord('application', {
          jobTitle: title.trim(),
          companyId: companyId || '',
          status: appStatus,
          appliedAt: new Date().toISOString().slice(0, 10),
          nextAction: 'Review saved JD',
          nextFollowUpAt: '',
          location: location.trim(),
          jobUrl: sourceUrl.trim(),
          applicationUrl: careerPageUrl.trim(),
          jobType: employmentType,
          workArrangement: 'Remote',
          resumeReference: resumeVersion,
          jobDescription: descriptionText.trim(),
          prepNotes: responsibilities.trim(),
          notes: notes.trim(),
        })

        // Also link vault document if uploaded
        if (created.vaultFileId) {
          vaultApi.linkApplicationDocument(
            appId,
            {
              vaultFileId: created.vaultFileId,
              documentRole: 'JOB_DESCRIPTION',
            },
            token
          ).catch(() => {})
        }
      }

      setJds((prev) => [created, ...prev])
      setIsAddingJd(false)
      resetForm()
    } catch (err: any) {
      setFormError(err.message || 'Failed to save job description')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteJd = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm('Delete this saved job description?')) return
    try {
      await vaultApi.deleteJobDescription(id, token)
      setJds((prev) => prev.filter((j) => j.id !== id))
      if (selectedJdDetail?.id === id) setSelectedJdDetail(null)
    } catch (err: any) {
      alert(err.message || 'Failed to delete job description')
    }
  }

  const resetForm = () => {
    setTitle('')
    setCompanyId('')
    setLocation('')
    setExperienceLevel('')
    setSourceUrl('')
    setCareerPageUrl('')
    setDeadline('')
    setResponsibilities('')
    setRequiredSkills('')
    setPreferredSkills('')
    setDescriptionText('')
    setNotes('')
    setJdFile(null)
  }

  const filteredJds = jds
    .filter((j) => selectedCompanyId === 'ALL' || j.companyId === selectedCompanyId)
    .filter((j) => {
      const q = search.toLowerCase()
      return (
        j.title.toLowerCase().includes(q) ||
        (j.company?.name && j.company.name.toLowerCase().includes(q)) ||
        (j.descriptionText && j.descriptionText.toLowerCase().includes(q)) ||
        j.requiredSkills.some((s) => s.toLowerCase().includes(q))
      )
    })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Toolbar */}
      <div className="vault-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div className="vault-search-box">
            <Search size={15} style={{ color: 'var(--subtle)' }} />
            <input
              placeholder="Search roles, skills, companies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="vault-select"
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
          >
            <option value="ALL">All Companies</option>
            {data.companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <button className="button button-primary" onClick={() => setIsAddingJd(true)}>
          <Plus size={14} /> Save Job Description
        </button>
      </div>

      {/* Grid of Saved JDs */}
      {isLoading ? (
        <div className="directory-empty" style={{ padding: '48px 24px' }}>Loading job descriptions…</div>
      ) : filteredJds.length > 0 ? (
        <div className="jd-grid">
          {filteredJds.map((jd) => (
            <div key={jd.id} className="jd-card" onClick={() => setSelectedJdDetail(jd)} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>{jd.title}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontSize: '12px', color: 'var(--accent)' }}>
                    <Building2 size={13} />
                    <span>{jd.company?.name || 'Company Not Specified'}</span>
                    {jd.location && <span style={{ color: 'var(--muted)' }}>• {jd.location}</span>}
                  </div>
                </div>

                <button
                  className="row-delete-button"
                  title="Delete Job Description"
                  onClick={(e) => handleDeleteJd(jd.id, e)}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {jd.descriptionText && (
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {jd.descriptionText}
                </p>
              )}

              {jd.requiredSkills.length > 0 && (
                <div className="jd-skills-chips">
                  {jd.requiredSkills.slice(0, 4).map((s) => (
                    <span key={s} className="skill-chip">{s}</span>
                  ))}
                  {jd.requiredSkills.length > 4 && (
                    <span className="skill-chip">+{jd.requiredSkills.length - 4}</span>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--line)', paddingTop: '10px', fontSize: '11px', color: 'var(--muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {jd.vaultFile && (
                    <span className="vault-badge jd" style={{ fontSize: '10px' }}>
                      <FileText size={10} /> Attached Doc
                    </span>
                  )}
                  {jd.applicationDeadline && (
                    <span>
                      <Calendar size={11} style={{ display: 'inline', marginRight: '3px' }} />
                      Due {new Date(jd.applicationDeadline).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {jd.sourceUrl && (
                  <a
                    href={jd.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{ color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                  >
                    Posting <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="directory-empty" style={{ padding: '48px 24px' }}>
          <BriefcaseBusiness size={36} style={{ color: 'var(--subtle)', margin: '0 auto 10px' }} />
          <h3>No Job Descriptions Saved</h3>
          <p>Save job specifications by uploading files (PDF, screenshots) or pasting job posting text.</p>
          <button className="button button-primary" onClick={() => setIsAddingJd(true)}>
            <Plus size={14} /> Save First Job Description
          </button>
        </div>
      )}

      {/* Add JD Modal */}
      {isAddingJd && (
        <div className="vault-modal-scrim" onClick={(e) => e.target === e.currentTarget && setIsAddingJd(false)}>
          <div className="vault-modal large" role="dialog" aria-modal="true" aria-labelledby="add-jd-title">
            <div className="vault-modal-header">
              <h2 id="add-jd-title">Save Job Description</h2>
              <button className="row-action-button" onClick={() => setIsAddingJd(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateJd} style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="vault-modal-body">
                {formError && (
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
                    <span>{formError}</span>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                  <div className="vault-form-field">
                    <label className="vault-field-label" htmlFor="jd-title-input">
                      Job Title <span style={{ color: 'var(--accent)' }}>*</span>
                    </label>
                    <input
                      id="jd-title-input"
                      className="vault-input"
                      required
                      placeholder="e.g. Senior Software Engineer"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div className="vault-form-field">
                    <CompanySelectWithCreate
                      label="Company"
                      value={companyId}
                      onChange={setCompanyId}
                      placeholder="None (Independent Opportunity)"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                  <div className="vault-form-field">
                    <label className="vault-field-label" htmlFor="jd-location-input">
                      Location
                    </label>
                    <input
                      id="jd-location-input"
                      className="vault-input"
                      placeholder="e.g. Remote, San Francisco"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>
                  <div className="vault-form-field">
                    <label className="vault-field-label" htmlFor="jd-exp-input">
                      Experience Level
                    </label>
                    <input
                      id="jd-exp-input"
                      className="vault-input"
                      placeholder="e.g. Mid, Senior, Lead"
                      value={experienceLevel}
                      onChange={(e) => setExperienceLevel(e.target.value)}
                    />
                  </div>
                  <div className="vault-form-field">
                    <label className="vault-field-label" htmlFor="jd-deadline-input">
                      Application Deadline
                    </label>
                    <input
                      id="jd-deadline-input"
                      type="date"
                      className="vault-input"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                  <div className="vault-form-field">
                    <label className="vault-field-label" htmlFor="jd-posting-url">
                      Job Posting URL
                    </label>
                    <input
                      id="jd-posting-url"
                      className="vault-input"
                      placeholder="https://company.com/jobs/role"
                      value={sourceUrl}
                      onChange={(e) => setSourceUrl(e.target.value)}
                    />
                  </div>
                  <div className="vault-form-field">
                    <label className="vault-field-label" htmlFor="jd-career-url">
                      Company Career Page URL
                    </label>
                    <input
                      id="jd-career-url"
                      className="vault-input"
                      placeholder="https://company.com/careers"
                      value={careerPageUrl}
                      onChange={(e) => setCareerPageUrl(e.target.value)}
                    />
                  </div>
                </div>

                <div className="vault-form-field">
                  <label className="vault-field-label">
                    Attach File (PDF, DOCX, Screenshot PNG/JPG)
                  </label>
                  <input
                    className="vault-input"
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp"
                    onChange={(e) => setJdFile(e.target.files?.[0] || null)}
                  />
                  <span className="vault-field-hint">
                    Uploaded file will be securely archived in Vault and linked to this JD.
                  </span>
                </div>

                <div className="vault-form-field">
                  <label className="vault-field-label" htmlFor="jd-skills-input">
                    Required Skills (comma-separated)
                  </label>
                  <input
                    id="jd-skills-input"
                    className="vault-input"
                    placeholder="React, TypeScript, GraphQL, Node.js"
                    value={requiredSkills}
                    onChange={(e) => setRequiredSkills(e.target.value)}
                  />
                </div>

                <div className="vault-form-field">
                  <label className="vault-field-label" htmlFor="jd-desc-text">
                    Job Description Text / Responsibilities
                  </label>
                  <textarea
                    id="jd-desc-text"
                    className="vault-textarea"
                    rows={4}
                    placeholder="Paste raw JD text, requirements, interview expectations..."
                    value={descriptionText}
                    onChange={(e) => setDescriptionText(e.target.value)}
                  />
                </div>

                {/* Simultaneous Connected Application Creation */}
                <div
                  style={{
                    padding: '14px',
                    borderRadius: '8px',
                    background: 'var(--surface-muted)',
                    border: '1px solid var(--line)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    marginTop: '8px',
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={createApplication}
                      onChange={(e) => setCreateApplication(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <strong style={{ fontSize: '13px', color: 'var(--ink)' }}>
                      Create connected Application immediately
                    </strong>
                  </label>

                  {createApplication && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', paddingTop: '4px' }}>
                      <div>
                        <label className="vault-field-label">Initial Status</label>
                        <select
                          className="vault-select-full"
                          value={appStatus}
                          onChange={(e) => setAppStatus(e.target.value)}
                        >
                          <option value="Saved">Saved</option>
                          <option value="Applied">Applied</option>
                          <option value="Assessment">Assessment</option>
                          <option value="Interview">Interview</option>
                        </select>
                      </div>

                      <div>
                        <label className="vault-field-label">Attach Resume Version</label>
                        <select
                          className="vault-select-full"
                          value={resumeVersion}
                          onChange={(e) => setResumeVersion(e.target.value)}
                        >
                          <option value="">-- Choose resume version --</option>
                          {resumeGroups.map((g) =>
                            g.versions.map((v: any) => (
                              <option key={v.id} value={`${g.name} (${v.versionLabel})`}>
                                {g.name} — {v.versionLabel} {v.isCurrent ? '(Current)' : ''}
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="vault-modal-footer">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setIsAddingJd(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={isSubmitting || !title.trim()}
                >
                  {isSubmitting ? 'Saving…' : 'Save Job Description'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JD Detail Modal */}
      {selectedJdDetail && (
        <div className="vault-modal-scrim" onClick={(e) => e.target === e.currentTarget && setSelectedJdDetail(null)}>
          <div className="vault-modal large" role="dialog" aria-modal="true">
            <div className="vault-modal-header">
              <div>
                <h2 style={{ fontSize: '18px', color: 'var(--ink)' }}>{selectedJdDetail.title}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', fontSize: '12px', color: 'var(--accent)' }}>
                  <Building2 size={13} />
                  <span>{selectedJdDetail.company?.name || 'Independent Opportunity'}</span>
                  {selectedJdDetail.location && <span style={{ color: 'var(--muted)' }}>• {selectedJdDetail.location}</span>}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {selectedJdDetail.sourceUrl && (
                  <a href={selectedJdDetail.sourceUrl} target="_blank" rel="noreferrer" className="button button-secondary" style={{ height: '32px' }}>
                    <ExternalLink size={13} /> View Posting
                  </a>
                )}
                <button className="row-action-button" onClick={() => setSelectedJdDetail(null)}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="vault-modal-body">
              {selectedJdDetail.vaultFile && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--surface-muted)', border: '1px solid var(--line)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileText size={18} style={{ color: 'var(--accent)' }} />
                    <div>
                      <strong style={{ fontSize: '13px' }}>{selectedJdDetail.vaultFile.displayName}</strong>
                      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Original document stored in Vault</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className="button button-secondary"
                      style={{ height: '28px', fontSize: '11px' }}
                      onClick={() => setActivePreviewFile(selectedJdDetail.vaultFile!)}
                    >
                      <Eye size={12} /> Preview
                    </button>
                    <button
                      type="button"
                      className="button button-secondary"
                      style={{ height: '28px', fontSize: '11px' }}
                      onClick={() =>
                        vaultApi.downloadFile(
                          selectedJdDetail.vaultFile!.id,
                          selectedJdDetail.vaultFile!.originalFilename,
                          token,
                        )
                      }
                    >
                      <Download size={12} /> Download
                    </button>
                  </div>
                </div>
              )}

              {selectedJdDetail.requiredSkills.length > 0 && (
                <div>
                  <span className="sidebar-section-label" style={{ padding: 0 }}>Required Skills</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                    {selectedJdDetail.requiredSkills.map((s) => (
                      <span key={s} className="skill-chip">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {selectedJdDetail.descriptionText && (
                <div>
                  <span className="sidebar-section-label" style={{ padding: 0 }}>Role Description & Requirements</span>
                  <div style={{ marginTop: '6px', padding: '14px', background: 'var(--surface-muted)', borderRadius: '8px', fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap', color: 'var(--ink)' }}>
                    {selectedJdDetail.descriptionText}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Preview File Modal */}
      {activePreviewFile && (
        <VaultFileDetailModal
          file={activePreviewFile}
          onClose={() => setActivePreviewFile(null)}
          onUpdate={(u) => setActivePreviewFile(u)}
          onDelete={() => {
            setActivePreviewFile(null)
            loadJds()
          }}
        />
      )}
    </div>
  )
}
