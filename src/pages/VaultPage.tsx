import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  BriefcaseBusiness,
  Files,
  Trash2,
  UploadCloud,
} from 'lucide-react'
import '../components/vault/vault.css'
import { VaultOverview } from '../components/vault/VaultOverview'
import { AllDocumentsPage } from '../components/vault/AllDocumentsPage'
import { ResumeVaultPage } from '../components/vault/ResumeVaultPage'
import { JobDescriptionsPage } from '../components/vault/JobDescriptionsPage'
import { VaultTrashPage } from '../components/vault/VaultTrashPage'
import { VaultUploadDialog } from '../components/vault/VaultUploadDialog'
import type { VaultFile } from '../types'

export type VaultTab = 'overview' | 'resumes' | 'jobs' | 'all' | 'trash'

export function VaultPage() {
  const location = useLocation()
  const navigate = useNavigate()

  // Determine active tab from URL path
  const getTabFromPath = (path: string): VaultTab => {
    if (path.includes('/vault/resumes')) return 'resumes'
    if (path.includes('/vault/jobs')) return 'jobs'
    if (path.includes('/vault/all')) return 'all'
    if (path.includes('/vault/trash')) return 'trash'
    return 'overview'
  }

  const activeTab = getTabFromPath(location.pathname)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleTabChange = (tab: VaultTab) => {
    if (tab === 'overview') navigate('/vault')
    else navigate(`/vault/${tab}`)
  }

  const handleUploadSuccess = (_file: VaultFile) => {
    setRefreshTrigger((prev) => prev + 1)
  }

  return (
    <section className="vault-container">
      {/* Page Header */}
      <div className="vault-header">
        <div className="vault-title-group">
          <p className="eyebrow">CAREEROS VAULT</p>
          <h1>Career Document Vault</h1>
          <p>
            Centralized private career asset storage with immutable version history and cross-module synchronization.
          </p>
        </div>

        <div className="vault-header-actions">
          <button className="button button-primary" onClick={() => setIsUploadDialogOpen(true)}>
            <UploadCloud size={15} /> Upload File
          </button>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="vault-nav-tabs">
        <button
          className={`vault-tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => handleTabChange('overview')}
        >
          <LayoutDashboard size={15} /> Overview
        </button>

        <button
          className={`vault-tab-button ${activeTab === 'resumes' ? 'active' : ''}`}
          onClick={() => handleTabChange('resumes')}
        >
          <FileText size={15} /> Resumes
        </button>

        <button
          className={`vault-tab-button ${activeTab === 'jobs' ? 'active' : ''}`}
          onClick={() => handleTabChange('jobs')}
        >
          <BriefcaseBusiness size={15} /> Job Descriptions
        </button>

        <button
          className={`vault-tab-button ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => handleTabChange('all')}
        >
          <Files size={15} /> All Documents
        </button>

        <button
          className={`vault-tab-button ${activeTab === 'trash' ? 'active' : ''}`}
          onClick={() => handleTabChange('trash')}
        >
          <Trash2 size={15} /> Trash
        </button>
      </div>

      {/* Content Area */}
      <div key={refreshTrigger} style={{ minHeight: '400px' }}>
        {activeTab === 'overview' && (
          <VaultOverview
            onNavigateTab={(tab) => handleTabChange(tab)}
            onOpenUpload={() => setIsUploadDialogOpen(true)}
            onOpenNewResumeGroup={() => handleTabChange('resumes')}
            onOpenNewJobDescription={() => handleTabChange('jobs')}
          />
        )}

        {activeTab === 'resumes' && <ResumeVaultPage />}

        {activeTab === 'jobs' && <JobDescriptionsPage />}

        {activeTab === 'all' && (
          <AllDocumentsPage onOpenUpload={() => setIsUploadDialogOpen(true)} />
        )}

        {activeTab === 'trash' && <VaultTrashPage />}
      </div>

      {/* Global Upload Dialog */}
      {isUploadDialogOpen && (
        <VaultUploadDialog
          initialCategory={activeTab === 'resumes' ? 'RESUME' : activeTab === 'jobs' ? 'JOB_DESCRIPTION' : 'OTHER'}
          onClose={() => setIsUploadDialogOpen(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </section>
  )
}
