ALTER TABLE "User"
  ADD COLUMN "firstName" TEXT,
  ADD COLUMN "lastName" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "location" TEXT,
  ADD COLUMN "headline" TEXT,
  ADD COLUMN "bio" TEXT,
  ADD COLUMN "currentRole" TEXT,
  ADD COLUMN "skills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "linkedinUrl" TEXT,
  ADD COLUMN "githubUrl" TEXT,
  ADD COLUMN "portfolioUrl" TEXT;
