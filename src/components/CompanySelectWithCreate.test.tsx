// @vitest-environment jsdom
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CompanySelectWithCreate } from './CompanySelectWithCreate';
import type { Company } from '../types';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('CompanySelectWithCreate', () => {
  const mockCompanies: Company[] = [
    {
      id: 'comp-1',
      name: 'Acme Corp',
      website: 'https://acme.com',
      industry: 'Technology',
      location: 'San Francisco, CA',
      size: '100-500',
      tags: [],
      careersUrl: '',
      linkedinUrl: '',
      notes: '',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'comp-2',
      name: 'Beta Global',
      website: 'https://beta.org',
      industry: 'Finance',
      location: 'New York, NY',
      size: '1000+',
      tags: [],
      careersUrl: '',
      linkedinUrl: '',
      notes: '',
      createdAt: new Date().toISOString(),
    },
  ];

  it('renders existing companies when dropdown is opened', () => {
    const handleChange = vi.fn();
    render(
      <CompanySelectWithCreate
        companies={mockCompanies}
        value=""
        onChange={handleChange}
      />
    );

    // Click the main selector to open dropdown
    fireEvent.click(screen.getByText('Select or create company...'));

    expect(screen.getByText('Acme Corp')).toBeTruthy();
    expect(screen.getByText('Beta Global')).toBeTruthy();
  });

  it('opens inline company creation when Create New Company button is clicked', () => {
    render(
      <CompanySelectWithCreate
        companies={mockCompanies}
        value=""
        onChange={vi.fn()}
      />
    );

    // Open dropdown
    fireEvent.click(screen.getByText('Select or create company...'));

    // Click create button
    const newBtn = screen.getByRole('button', { name: /Create "New Company"/i });
    fireEvent.click(newBtn);

    expect(screen.getByText('Quick Create Company')).toBeTruthy();
    expect(screen.getByLabelText(/Company Name/i)).toBeTruthy();
  });

  it('detects duplicate company name before submission', async () => {
    render(
      <CompanySelectWithCreate
        companies={mockCompanies}
        value=""
        onChange={vi.fn()}
      />
    );

    // Open dropdown
    fireEvent.click(screen.getByText('Select or create company...'));

    fireEvent.click(screen.getByRole('button', { name: /Create "New Company"/i }));

    const nameInput = screen.getByLabelText(/Company Name/i);
    fireEvent.change(nameInput, { target: { value: 'acme corp' } });

    expect(screen.getByText(/Existing match:/i)).toBeTruthy();
  });

  it('successfully creates and selects new company inline', async () => {
    const handleChange = vi.fn();
    const handleCreated = vi.fn();
    const handleCreateCustom = vi.fn().mockResolvedValue({
      id: 'comp-new',
      name: 'Cyberdyne Systems',
      website: 'https://cyberdyne.io',
      industry: 'Robotics',
      location: 'Los Angeles, CA',
      size: '50-100',
      tags: [],
      careersUrl: '',
      linkedinUrl: '',
      notes: '',
      createdAt: new Date().toISOString(),
    });

    render(
      <CompanySelectWithCreate
        companies={mockCompanies}
        value=""
        onChange={handleChange}
        onCompanyCreated={handleCreated}
        onCreateCompany={handleCreateCustom}
      />
    );

    // Open dropdown
    fireEvent.click(screen.getByText('Select or create company...'));

    fireEvent.click(screen.getByRole('button', { name: /Create "New Company"/i }));

    fireEvent.change(screen.getByLabelText(/Company Name/i), { target: { value: 'Cyberdyne Systems' } });
    fireEvent.change(screen.getByLabelText(/Website/i), { target: { value: 'https://cyberdyne.io' } });

    fireEvent.click(screen.getByRole('button', { name: /Create & Select/i }));

    await waitFor(() => {
      expect(handleCreateCustom).toHaveBeenCalledWith('Cyberdyne Systems', 'https://cyberdyne.io');
      expect(handleChange).toHaveBeenCalledWith('comp-new');
      expect(handleCreated).toHaveBeenCalledWith(expect.objectContaining({
        id: 'comp-new',
        name: 'Cyberdyne Systems',
      }));
    });
  });
});
