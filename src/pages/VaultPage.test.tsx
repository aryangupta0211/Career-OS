// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { VaultPage } from './VaultPage'

vi.mock('../context/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'usr_1', email: 'test@example.com', name: 'Tester' },
    session: { access_token: 'mock-token' },
  }),
}))

vi.mock('../context/useCareerData', () => ({
  useCareerData: () => ({
    data: {
      companies: [{ id: 'comp-1', name: 'Stripe' }],
      applications: [{ id: 'app-1', jobTitle: 'Frontend Lead', companyId: 'comp-1', status: 'Applied' }],
      contacts: [],
      tasks: [],
      events: [],
      activities: [],
    },
    addRecord: vi.fn(),
    updateRecord: vi.fn(),
    deleteRecord: vi.fn(),
  }),
}))

describe('VaultPage integration', () => {
  it('renders the Vault page header, storage summary, and navigation tabs', async () => {
    render(
      <MemoryRouter initialEntries={['/vault']}>
        <Routes>
          <Route path="/vault/*" element={<VaultPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Career Document Vault')).toBeDefined()
    expect(screen.getAllByRole('button', { name: /Overview/i })[0]).toBeDefined()
    expect(screen.getAllByRole('button', { name: /Resumes/i })[0]).toBeDefined()
    expect(screen.getAllByRole('button', { name: /Job Descriptions/i })[0]).toBeDefined()
    expect(screen.getAllByRole('button', { name: /All Documents/i })[0]).toBeDefined()
    expect(screen.getAllByRole('button', { name: /Trash/i })[0]).toBeDefined()
  })

  it('opens and closes the global upload modal', () => {
    render(
      <MemoryRouter initialEntries={['/vault']}>
        <Routes>
          <Route path="/vault/*" element={<VaultPage />} />
        </Routes>
      </MemoryRouter>,
    )

    const uploadButtons = screen.getAllByRole('button', { name: /Upload File/i })
    fireEvent.click(uploadButtons[0])

    expect(screen.getByRole('dialog', { name: /Upload to Vault/i })).toBeDefined()

    const closeBtn = screen.getByRole('button', { name: /Cancel/i })
    fireEvent.click(closeBtn)

    expect(screen.queryByRole('dialog', { name: /Upload to Vault/i })).toBeNull()
  })
})
