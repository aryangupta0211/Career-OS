import { describe, it, expect } from 'vitest';
import { computeApplicationCompleteness } from './completeness';
import type { Application } from '../types';

describe('computeApplicationCompleteness', () => {
  it('returns 0% and all missing fields for an empty application', () => {
    const emptyApp: Partial<Application> = {};
    const result = computeApplicationCompleteness(emptyApp);
    expect(result.score).toBe(0);
    expect(result.status).toBe('minimal');
    const missingLabels = result.missingFields.map((f) => f.label);
    expect(missingLabels).toContain('Job Title');
    expect(missingLabels).toContain('Company');
    expect(missingLabels).toContain('Application Status');
  });

  it('calculates partial score when basic fields are provided', () => {
    const partialApp: Partial<Application> = {
      jobTitle: 'Full Stack Engineer',
      companyId: 'comp-1',
      status: 'Applied',
    };
    const result = computeApplicationCompleteness(partialApp);
    // jobTitle(20) + companyId(20) + status(15) = 55%
    expect(result.score).toBe(55);
    expect(result.status).toBe('good');
    const missingLabels = result.missingFields.map((f) => f.label);
    expect(missingLabels).not.toContain('Job Title');
    expect(missingLabels).not.toContain('Company');
    expect(missingLabels).not.toContain('Application Status');
    expect(missingLabels).toContain('Application Date');
  });

  it('calculates 100% when all key fields and options are populated', () => {
    const fullApp: Partial<Application> = {
      jobTitle: 'Staff Engineer',
      companyId: 'comp-1',
      status: 'Interview',
      appliedAt: '2026-11-01',
      resumeReference: 'Staff Resume v2.pdf',
      jobDescription: 'Requirements and responsibilities...',
      jobUrl: 'https://careers.google.com/jobs/12345',
    };
    const result = computeApplicationCompleteness(fullApp);
    expect(result.score).toBe(100);
    expect(result.status).toBe('complete');
    expect(result.missingFields.length).toBe(0);
  });

  it('supports options hasLinkedDoc and hasLinkedJd to satisfy completeness', () => {
    const appWithLinkedVault: Partial<Application> = {
      jobTitle: 'Staff Engineer',
      companyId: 'comp-1',
      status: 'Interview',
      appliedAt: '2026-11-01',
      jobUrl: 'https://careers.google.com/jobs/12345',
    };
    const result = computeApplicationCompleteness(appWithLinkedVault, {
      hasLinkedDoc: true,
      hasLinkedJd: true,
    });
    expect(result.score).toBe(100);
    expect(result.status).toBe('complete');
  });
});
