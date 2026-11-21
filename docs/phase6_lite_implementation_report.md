# CareerOS Phase 6 Lite — Smart Engine Implementation Report

## Executive Summary

Phase 6 Lite introduces a **deterministic intelligence layer** for CareerOS. It provides meaningful, explainable automation and career insights without relying on paid AI APIs, external LLM endpoints, or black-box heuristic guesses.

All processing operates locally using:
- Pure TypeScript/JavaScript deterministic algorithms.
- Multi-format document text extraction (`pdf-parse`, `mammoth`, plain text).
- Extensible skill dictionary with boundary-aware regex tokenization to prevent false positives.
- Weighted mathematical scoring for resume-to-application matching.
- Cryptographic SHA-256 content hashing for instant duplicate detection and physical storage deduplication.
- Scoped full-text and metadata document search.
- Rule-based scheduling and actionable dashboard insights.

---

## 1. Modules Implemented

### 1.1 Module 6.1 — Job Description Text and Skill Extraction
- **Location**: `backend/src/intelligence/jd-extractor.ts`, `backend/src/intelligence/document-processor.ts`, `backend/src/intelligence/skills/`
- **Supported Formats**:
  - PDF: Extracted via `pdf-parse`. Detects scanned documents with no selectable text layer (< 15 characters) and flags them gracefully with `EMPTY` / `OCR_REQUIRED` status instead of producing corrupted text.
  - DOCX: Extracted via `mammoth.extractRawText`.
  - TXT: Native UTF-8 parsing.
- **Extracted Fields & Provenance**:
  - Basic: Target job title, company name, location, employment type (`Full-time`, `Contract`, etc.), work arrangement (`Remote`, `Hybrid`, `On-site`), experience requirements (e.g. `5+ years`), education requirements (e.g. `Bachelor's in Computer Science`), salary/compensation (e.g. `$160k - $190k`), and application deadline.
  - Technical: Categorized required vs. preferred skills identified through section detection ("Requirements" vs. "Preferred Qualifications").
  - Soft Skills & Keywords: Soft skills matched from dictionary; unique domain keywords extracted.
  - Provenance: Every field captures `value`, `evidence` snippet, `method` (`header`, `pattern`, `section`, `dictionary`), `confidence` (0.0 - 1.0), and `confirmed: false`.
- **Skill Dictionary & Matcher**:
  - Over 45 skills defined across 10 categories (Programming Languages, Frontend, Backend, Databases, DevOps & Cloud, AI & Machine Learning, Data Engineering, Developer Tools, Software Engineering Concepts, Soft Skills).
  - Aliases mapped to canonical names (e.g., `js` -> `JavaScript`, `ts` -> `TypeScript`, `k8s` -> `Kubernetes`, `postgres` -> `PostgreSQL`, `golang` -> `Go`).
  - **False Positive Prevention**: Special token matchers for ambiguous short symbols (`C`, `Go`, `R`, `Express`, `Next.js`). For example, `C` only matches in programming contexts (such as `C/C++`, `ANSI C`, `C programming`, or `Python, Java, C, Rust`), never matching ordinary English occurrences like "section c" or "vitamin c".
- **User Experience**:
  - Added "Extract Details" action in `src/components/vault/JobDescriptionsPage.tsx`.
  - Implemented `src/components/vault/JdExtractionModal.tsx` allowing users to review, edit, add, or reject fields before applying them to the form.

### 1.2 Module 6.2 — Resume-to-Application Matching
- **Location**: `backend/src/intelligence/resume-matcher.ts`
- **Algorithm & Weights**:
  | Dimension | Weight |
  |---|---:|
  | Required skill coverage | 45% |
  | Preferred skill coverage | 15% |
  | Target role similarity | 20% |
  | Relevant keyword coverage | 10% |
  | Experience relevance | 10% |
- **Score Normalization**: Final score normalized between 0 and 100 with clear tier assignment (`High` >= 75%, `Medium` >= 50%, `Low` < 50%).
- **Key Characteristics**:
  - Missing skills are differentiated from unavailable metadata.
  - Deduplicated keywords prevent score inflation from repeated mentions.
  - Human-readable explanation generated automatically (e.g., *"Matches 4/4 required skills (React, TypeScript, Node.js...). Role closely aligns with target."*).
- **User Interface**:
  - Integrated `src/components/ApplicationIntelligenceSection.tsx` into `src/components/RecordDialog.tsx` under the "Smart Prep & Matching" tab.
  - Displays match percentage, matched vs missing skills, role tags, and an "Attach Version" button.

### 1.3 Module 6.3 — Automatic Preparation Checklist Generation
- **Location**: `backend/src/intelligence/preparation-generator.ts`
- **Mapping**: Skills mapped to specific interview preparation topics (e.g., Java -> OOP, Collections, Multithreading; SQL -> Joins, Indexing, Transactions; React -> Virtual DOM, Hooks, Performance; DSA -> Two-pointer, Hash Maps, Trees, Graphs).
- **Categorization**: Auto-assigns categories (`Technical Prep`, `System Design`, `DSA Practice`, `Behavioral Prep`) and priorities (`High` for required skills, `Medium` for preferred).
- **Scheduling**: Supports schedule generation within configurable deadline dates.
- **Workflow & Integrity**:
  - Preview generated checklist.
  - Toggle selections and edit tasks.
  - Click "Add Selected Tasks" to batch-create confirmed tasks in the database linked to the application. Tasks never auto-create without user approval.

### 1.4 Module 6.4 — SHA-256 Duplicate File Detection & Safe File Reuse
- **Location**: `backend/src/intelligence/file-hash.ts`, `backend/src/vault/routes.ts`, `src/components/vault/VaultUploadDialog.tsx`
- **Workflow**:
  1. Computes SHA-256 hash securely on backend.
  2. Queries active vault files belonging to the authenticated user (`where: { userId, sha256Hash, status: 'ACTIVE' }`). Strict user isolation guarantees zero cross-user leakage.
  3. Returns existing file metadata (original filename, upload date, size, associations).
  4. In `VaultUploadDialog.tsx`, displays a duplicate warning banner with options:
     - **Reuse Existing File**: Immediately links the existing `VaultFile` without uploading a duplicate physical copy to Supabase Storage, preserving storage quota.
     - **Upload as New Copy**: Allows proceeding if user explicitly chooses.

### 1.5 Module 6.5 — Document Content & Metadata Search
- **Location**: `backend/src/intelligence/document-search.ts`, `src/components/vault/VaultSearchSection.tsx`
- **Two Search Layers**:
  1. **Metadata Search**: Matches against display name, filename, description, tags, category, linked company, and job title.
  2. **Content Search**: Matches against text inside documents (e.g. linked JD description text, requirements, responsibilities).
- **UI Highlights**:
  - Displays matching type badge (`Document Content`, `Filename or Metadata`).
  - Displays contextual snippet highlighting the matched term in context.
  - Integrated into `src/pages/VaultPage.tsx`.

### 1.6 Module 6.6 — Smart Reminders & Career Insights
- **Location**: `backend/src/intelligence/insights.ts`, `src/components/DashboardInsightsSection.tsx`
- **Deterministic Rules**:
  - Upcoming interviews (interviews within 7 days).
  - Overdue tasks (`dueAt < now` and status != `COMPLETED`).
  - Stale applications (status is `APPLIED` with >= 10 days elapsed and no upcoming events).
  - Approaching follow-ups (networking contacts needing follow-up within 3 days).
  - Target interview preparation tasks due soon.
- **Dashboard UI**:
  - Mounted on `src/pages/Dashboard.tsx`.
  - Features actionable cards with severity indicators (`urgent`, `warning`, `info`) and direct action links (`/calendar`, `/tasks`, `/applications`, `/contacts`).

---

## 2. API Endpoints Inventory

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/intelligence/jd/extract` | Extracts structured metadata and skills from multipart file, vault file, or raw text. |
| `GET` | `/api/intelligence/applications/:id/resume-matches` | Evaluates and ranks user resume versions against application requirements. |
| `POST` | `/api/intelligence/applications/:id/preparation/generate` | Generates structured preparation tasks from JD requirements. |
| `POST` | `/api/intelligence/applications/:id/preparation/create-tasks` | Batch-creates confirmed preparation tasks in user's `Task` records. |
| `POST` | `/api/intelligence/files/check-duplicate` | Checks whether file buffer or SHA-256 hash matches an existing user Vault file. |
| `GET` | `/api/intelligence/search` | Scoped full-text and metadata search across user Vault documents. |
| `GET` | `/api/vault/search` | Alias endpoint for Vault search. |
| `GET` | `/api/intelligence/insights` | Generates actionable reminders, overdue notices, and workspace statistics. |

---

## 3. Database & Schema Safety

- **Prisma Schema**: `prisma/schema.prisma` already included `VaultFile.sha256Hash`, `JobDescription.requiredSkills`, `JobDescription.preferredSkills`, `JobDescription.descriptionText`, and `Task`.
- **Migration Status**: Verified with `npx prisma migrate status --config=backend/prisma.config.ts`:
  - 6 migrations found.
  - Database schema is up-to-date.
  - Zero destructive changes or resets performed.

---

## 4. Test & Build Results

### 4.1 Automated Test Suite
- Ran `npx vitest run`:
  - **Test Files**: 33 passed (100%)
  - **Tests**: 145 passed (100%)
  - **Intelligence Test Suites**:
    - `backend/src/intelligence/skills.test.ts` (6 tests passed)
    - `backend/src/intelligence/jd-extractor.test.ts` (4 tests passed)
    - `backend/src/intelligence/resume-matcher.test.ts` (4 tests passed)
    - `backend/src/intelligence/preparation-generator.test.ts` (3 tests passed)
    - `backend/src/intelligence/file-hash.test.ts` (3 tests passed)
    - `backend/src/intelligence/routes.test.ts` (6 tests passed)

### 4.2 Production Build Verification
- **API Build**: `npm run build:api` completed with exit code 0 (`tsc -p tsconfig.json`).
- **Frontend Build**: `npm run build` completed with exit code 0 (`tsc -b && vite build`).

