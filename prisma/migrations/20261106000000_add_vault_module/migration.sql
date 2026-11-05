-- CreateEnum
CREATE TYPE "VaultFileCategory" AS ENUM ('RESUME', 'JOB_DESCRIPTION', 'COVER_LETTER', 'PORTFOLIO', 'CERTIFICATE', 'SUPPORTING_DOCUMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "VaultFileStatus" AS ENUM ('ACTIVE', 'TRASHED', 'DELETED');

-- CreateEnum
CREATE TYPE "DocumentRole" AS ENUM ('SUBMITTED_RESUME', 'COVER_LETTER', 'JOB_DESCRIPTION', 'PORTFOLIO', 'CERTIFICATE', 'SUPPORTING_DOCUMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "CompanyResourceType" AS ENUM ('OFFICIAL_WEBSITE', 'CAREERS_PAGE', 'LINKEDIN', 'JOB_POSTING', 'COMPANY_BLOG', 'DOCUMENTATION', 'OTHER');

-- CreateTable
CREATE TABLE "VaultFile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "sha256Hash" TEXT,
    "category" "VaultFileCategory" NOT NULL DEFAULT 'OTHER',
    "description" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "uploadSource" TEXT,
    "status" "VaultFileStatus" NOT NULL DEFAULT 'ACTIVE',
    "deletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "VaultFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeGroup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetRole" TEXT,
    "description" TEXT,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ResumeGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeVersion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resumeGroupId" TEXT NOT NULL,
    "vaultFileId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "versionLabel" TEXT NOT NULL,
    "description" TEXT,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResumeVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobDescription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT,
    "applicationId" TEXT,
    "vaultFileId" TEXT,
    "title" TEXT NOT NULL,
    "location" TEXT,
    "experienceLevel" TEXT,
    "employmentType" TEXT,
    "sourceUrl" TEXT,
    "careerPageUrl" TEXT,
    "applicationDeadline" TIMESTAMPTZ(3),
    "responsibilities" TEXT,
    "requiredSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "descriptionText" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "JobDescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyResource" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "resourceType" "CompanyResourceType" NOT NULL DEFAULT 'OTHER',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CompanyResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationDocument" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "vaultFileId" TEXT NOT NULL,
    "resumeVersionId" TEXT,
    "documentRole" "DocumentRole" NOT NULL DEFAULT 'OTHER',
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyDocument" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vaultFileId" TEXT,
    "jobDescriptionId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorageUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "usedBytes" BIGINT NOT NULL DEFAULT 0,
    "fileCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "StorageUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VaultFile_storagePath_key" ON "VaultFile"("storagePath");

-- CreateIndex
CREATE INDEX "VaultFile_userId_status_createdAt_idx" ON "VaultFile"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "VaultFile_userId_category_idx" ON "VaultFile"("userId", "category");

-- CreateIndex
CREATE INDEX "VaultFile_userId_displayName_idx" ON "VaultFile"("userId", "displayName");

-- CreateIndex
CREATE UNIQUE INDEX "VaultFile_id_userId_key" ON "VaultFile"("id", "userId");

-- CreateIndex
CREATE INDEX "ResumeGroup_userId_isArchived_idx" ON "ResumeGroup"("userId", "isArchived");

-- CreateIndex
CREATE INDEX "ResumeGroup_userId_name_idx" ON "ResumeGroup"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ResumeGroup_id_userId_key" ON "ResumeGroup"("id", "userId");

-- CreateIndex
CREATE INDEX "ResumeVersion_userId_isCurrent_idx" ON "ResumeVersion"("userId", "isCurrent");

-- CreateIndex
CREATE INDEX "ResumeVersion_userId_resumeGroupId_idx" ON "ResumeVersion"("userId", "resumeGroupId");

-- CreateIndex
CREATE INDEX "ResumeVersion_vaultFileId_idx" ON "ResumeVersion"("vaultFileId");

-- CreateIndex
CREATE UNIQUE INDEX "ResumeVersion_id_userId_key" ON "ResumeVersion"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ResumeVersion_resumeGroupId_versionNumber_key" ON "ResumeVersion"("resumeGroupId", "versionNumber");

-- CreateIndex
CREATE INDEX "JobDescription_userId_companyId_idx" ON "JobDescription"("userId", "companyId");

-- CreateIndex
CREATE INDEX "JobDescription_userId_applicationId_idx" ON "JobDescription"("userId", "applicationId");

-- CreateIndex
CREATE INDEX "JobDescription_userId_title_idx" ON "JobDescription"("userId", "title");

-- CreateIndex
CREATE UNIQUE INDEX "JobDescription_id_userId_key" ON "JobDescription"("id", "userId");

-- CreateIndex
CREATE INDEX "CompanyResource_userId_companyId_idx" ON "CompanyResource"("userId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyResource_id_userId_key" ON "CompanyResource"("id", "userId");

-- CreateIndex
CREATE INDEX "ApplicationDocument_userId_applicationId_idx" ON "ApplicationDocument"("userId", "applicationId");

-- CreateIndex
CREATE INDEX "ApplicationDocument_userId_vaultFileId_idx" ON "ApplicationDocument"("userId", "vaultFileId");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationDocument_id_userId_key" ON "ApplicationDocument"("id", "userId");

-- CreateIndex
CREATE INDEX "CompanyDocument_userId_companyId_idx" ON "CompanyDocument"("userId", "companyId");

-- CreateIndex
CREATE INDEX "CompanyDocument_userId_vaultFileId_idx" ON "CompanyDocument"("userId", "vaultFileId");

-- CreateIndex
CREATE INDEX "CompanyDocument_userId_jobDescriptionId_idx" ON "CompanyDocument"("userId", "jobDescriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyDocument_id_userId_key" ON "CompanyDocument"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "StorageUsage_userId_key" ON "StorageUsage"("userId");

-- AddForeignKey
ALTER TABLE "VaultFile" ADD CONSTRAINT "VaultFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeGroup" ADD CONSTRAINT "ResumeGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeVersion" ADD CONSTRAINT "ResumeVersion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeVersion" ADD CONSTRAINT "ResumeVersion_resumeGroupId_userId_fkey" FOREIGN KEY ("resumeGroupId", "userId") REFERENCES "ResumeGroup"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeVersion" ADD CONSTRAINT "ResumeVersion_vaultFileId_userId_fkey" FOREIGN KEY ("vaultFileId", "userId") REFERENCES "VaultFile"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobDescription" ADD CONSTRAINT "JobDescription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobDescription" ADD CONSTRAINT "JobDescription_companyId_userId_fkey" FOREIGN KEY ("companyId", "userId") REFERENCES "Company"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobDescription" ADD CONSTRAINT "JobDescription_applicationId_userId_fkey" FOREIGN KEY ("applicationId", "userId") REFERENCES "JobApplication"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobDescription" ADD CONSTRAINT "JobDescription_vaultFileId_userId_fkey" FOREIGN KEY ("vaultFileId", "userId") REFERENCES "VaultFile"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyResource" ADD CONSTRAINT "CompanyResource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyResource" ADD CONSTRAINT "CompanyResource_companyId_userId_fkey" FOREIGN KEY ("companyId", "userId") REFERENCES "Company"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDocument" ADD CONSTRAINT "ApplicationDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDocument" ADD CONSTRAINT "ApplicationDocument_applicationId_userId_fkey" FOREIGN KEY ("applicationId", "userId") REFERENCES "JobApplication"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDocument" ADD CONSTRAINT "ApplicationDocument_vaultFileId_userId_fkey" FOREIGN KEY ("vaultFileId", "userId") REFERENCES "VaultFile"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDocument" ADD CONSTRAINT "ApplicationDocument_resumeVersionId_userId_fkey" FOREIGN KEY ("resumeVersionId", "userId") REFERENCES "ResumeVersion"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyDocument" ADD CONSTRAINT "CompanyDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyDocument" ADD CONSTRAINT "CompanyDocument_companyId_userId_fkey" FOREIGN KEY ("companyId", "userId") REFERENCES "Company"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyDocument" ADD CONSTRAINT "CompanyDocument_vaultFileId_userId_fkey" FOREIGN KEY ("vaultFileId", "userId") REFERENCES "VaultFile"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyDocument" ADD CONSTRAINT "CompanyDocument_jobDescriptionId_userId_fkey" FOREIGN KEY ("jobDescriptionId", "userId") REFERENCES "JobDescription"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorageUsage" ADD CONSTRAINT "StorageUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
