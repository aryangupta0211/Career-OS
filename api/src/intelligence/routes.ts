import { Router, type Request, type Response, type NextFunction } from 'express'
import multer from 'multer'
import { getPrismaClient } from '../db/client.js'
import { requireAuth } from '../auth/middleware.js'
import { config } from '../config.js'
import { getStorageProvider } from '../vault/storage.js'
import { extractTextFromBuffer } from './document-processor.js'
import { extractJDFromText } from './jd-extractor.js'
import { rankResumesForApplication, type ResumeCandidate } from './resume-matcher.js'
import { generatePreparationTasks } from './preparation-generator.js'
import { computeSha256, checkFileDuplicate } from './file-hash.js'
import { searchUserVaultDocuments } from './document-search.js'
import { generateSmartInsights } from './insights.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.VAULT_MAX_FILE_SIZE_BYTES,
  },
})

export const intelligenceRouter = Router()

// All intelligence endpoints require authentication
intelligenceRouter.use(requireAuth)

// ----------------------------------------------------
// 1. JD TEXT & SKILL EXTRACTION
// ----------------------------------------------------
intelligenceRouter.post(
  '/jd/extract',
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.auth!.userId
      const prisma = getPrismaClient()

      let textToExtract = ''
      let fileStatus: 'COMPLETED' | 'EMPTY' | 'UNSUPPORTED' | 'FAILED' = 'COMPLETED'
      let statusMessage: string | undefined

      // Case A: File uploaded directly in multipart form
      if (req.file) {
        const extraction = await extractTextFromBuffer(req.file.buffer, req.file.originalname, req.file.mimetype)
        textToExtract = extraction.text
        fileStatus = extraction.status
        statusMessage = extraction.message
      }
      // Case B: vaultFileId provided
      else if (req.body.vaultFileId) {
        const file = await prisma.vaultFile.findFirst({
          where: { id: req.body.vaultFileId, userId, status: 'ACTIVE' },
        })

        if (!file) {
          res.status(404).json({ error: { code: 'FILE_NOT_FOUND', message: 'Vault file not found.' } })
          return
        }

        const storage = getStorageProvider()
        const buffer = await storage.download(file.storagePath)
        const extraction = await extractTextFromBuffer(buffer, file.originalFilename, file.mimeType)
        textToExtract = extraction.text
        fileStatus = extraction.status
        statusMessage = extraction.message
      }
      // Case C: Raw text provided in body
      else if (typeof req.body.text === 'string') {
        textToExtract = req.body.text
      } else {
        res.status(400).json({
          error: {
            code: 'INVALID_INPUT',
            message: 'Provide a file upload, vaultFileId, or text field for JD extraction.',
          },
        })
        return
      }

      if (fileStatus === 'EMPTY' || fileStatus === 'UNSUPPORTED' || fileStatus === 'FAILED') {
        res.json({
          ok: false,
          data: {
            rawText: '',
            requiredSkills: [],
            preferredSkills: [],
            allSkills: [],
            softSkills: [],
            keywords: [],
            extractionStatus: fileStatus,
            statusMessage: statusMessage || 'Could not extract text from document.',
          },
        })
        return
      }

      const extracted = extractJDFromText(textToExtract)
      res.json({
        ok: true,
        data: extracted,
      })
    } catch (error) {
      next(error)
    }
  }
)

// ----------------------------------------------------
// 2. RESUME-TO-APPLICATION MATCHING
// ----------------------------------------------------
intelligenceRouter.get(
  '/applications/:id/resume-matches',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.auth!.userId
      const applicationId = req.params.id as string
      const prisma = getPrismaClient()

      // 1. Fetch application and any linked JD
      const application = await prisma.jobApplication.findFirst({
        where: { id: applicationId, userId },
        include: {
          jobDescriptions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      })

      if (!application) {
        res.status(404).json({ error: { code: 'APPLICATION_NOT_FOUND', message: 'Application not found.' } })
        return
      }

      const linkedJd = application.jobDescriptions[0]
      const requiredSkills: string[] = linkedJd?.requiredSkills || []
      const preferredSkills: string[] = linkedJd?.preferredSkills || []
      const keywords: string[] = []

      // If JD required skills empty, try to extract from application.jobDescription text
      if (requiredSkills.length === 0 && application.jobDescription) {
        const autoExtracted = extractJDFromText(application.jobDescription)
        for (const s of autoExtracted.requiredSkills) requiredSkills.push(s.name)
        for (const s of autoExtracted.preferredSkills) preferredSkills.push(s.name)
        for (const k of autoExtracted.keywords) keywords.push(k)
      }

      // 2. Fetch candidate resume versions for this user
      const resumeVersions = await prisma.resumeVersion.findMany({
        where: {
          userId,
          resumeGroup: { isArchived: false },
        },
        include: {
          resumeGroup: {
            select: { id: true, name: true, targetRole: true, skills: true },
          },
          vaultFile: {
            select: { displayName: true, originalFilename: true, description: true, tags: true },
          },
        },
        orderBy: [{ isCurrent: 'desc' }, { createdAt: 'desc' }],
      })

      const candidates: ResumeCandidate[] = resumeVersions.map((rv) => {
        const combinedSkills = Array.from(new Set([...rv.skills, ...(rv.resumeGroup.skills || [])]))
        return {
          id: rv.id,
          resumeGroupId: rv.resumeGroupId,
          versionLabel: `${rv.resumeGroup.name} (v${rv.versionNumber} - ${rv.versionLabel})`,
          targetRole: rv.resumeGroup.targetRole || undefined,
          skills: combinedSkills,
          tags: rv.vaultFile?.tags || [],
          description: rv.description || rv.vaultFile?.description || undefined,
        }
      })

      const matches = rankResumesForApplication(
        {
          jobTitle: application.jobTitle,
          requiredSkills,
          preferredSkills,
          keywords,
        },
        candidates
      )

      res.json({
        ok: true,
        matches,
      })
    } catch (error) {
      next(error)
    }
  }
)

// ----------------------------------------------------
// 3. PREPARATION CHECKLIST GENERATION
// ----------------------------------------------------
intelligenceRouter.post(
  '/applications/:id/preparation/generate',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.auth!.userId
      const applicationId = req.params.id as string
      const prisma = getPrismaClient()

      const application = await prisma.jobApplication.findFirst({
        where: { id: applicationId, userId },
        include: {
          company: { select: { id: true, name: true } },
          jobDescriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      })

      if (!application) {
        res.status(404).json({ error: { code: 'APPLICATION_NOT_FOUND', message: 'Application not found.' } })
        return
      }

      let skillsToPrepare: { name: string; isRequired?: boolean }[] = []

      // If client supplied explicit skills
      if (Array.isArray(req.body.skills) && req.body.skills.length > 0) {
        skillsToPrepare = req.body.skills
      } else {
        // Use linked JD skills or extract from application.jobDescription
        const linkedJd = application.jobDescriptions[0]
        if (linkedJd && (linkedJd.requiredSkills.length > 0 || linkedJd.preferredSkills.length > 0)) {
          for (const s of linkedJd.requiredSkills) skillsToPrepare.push({ name: s, isRequired: true })
          for (const s of linkedJd.preferredSkills) skillsToPrepare.push({ name: s, isRequired: false })
        } else if (application.jobDescription) {
          const extracted = extractJDFromText(application.jobDescription)
          for (const s of extracted.requiredSkills) skillsToPrepare.push({ name: s.name, isRequired: true })
          for (const s of extracted.preferredSkills) skillsToPrepare.push({ name: s.name, isRequired: false })
        }
      }

      const tasks = generatePreparationTasks(skillsToPrepare, {
        jobTitle: application.jobTitle,
        companyName: application.company?.name,
        scheduleConfig: req.body.scheduleConfig,
      })

      res.json({
        ok: true,
        tasks,
      })
    } catch (error) {
      next(error)
    }
  }
)

// Batch create confirmed preparation tasks in user's Tasks table
intelligenceRouter.post(
  '/applications/:id/preparation/create-tasks',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.auth!.userId
      const applicationId = req.params.id as string
      const prisma = getPrismaClient()

      const application = await prisma.jobApplication.findFirst({
        where: { id: applicationId, userId },
      })

      if (!application) {
        res.status(404).json({ error: { code: 'APPLICATION_NOT_FOUND', message: 'Application not found.' } })
        return
      }

      const taskInputs = Array.isArray(req.body.tasks) ? req.body.tasks : []
      if (taskInputs.length === 0) {
        res.status(400).json({ error: { code: 'NO_TASKS', message: 'No tasks provided to create.' } })
        return
      }

      const created = await prisma.$transaction(async (tx) => {
        const results = []
        for (const t of taskInputs) {
          const priorityVal =
            t.priority === 'High' ? 'HIGH' : t.priority === 'Low' ? 'LOW' : 'MEDIUM'

          const newTask = await tx.task.create({
            data: {
              userId,
              applicationId,
              companyId: application.companyId,
              title: t.title,
              description: t.description || null,
              category: t.category || 'Technical Prep',
              priority: priorityVal,
              status: 'TODO',
              dueAt: t.dueDate ? new Date(t.dueDate) : null,
            },
          })
          results.push(newTask)
        }
        return results
      })

      res.json({
        ok: true,
        createdCount: created.length,
        tasks: created,
      })
    } catch (error) {
      next(error)
    }
  }
)

// ----------------------------------------------------
// 4. SHA-256 DUPLICATE DETECTION
// ----------------------------------------------------
intelligenceRouter.post(
  '/files/check-duplicate',
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.auth!.userId
      const prisma = getPrismaClient()

      let hash = ''
      if (req.file) {
        hash = computeSha256(req.file.buffer)
      } else if (typeof req.body.sha256Hash === 'string') {
        hash = req.body.sha256Hash.trim().toLowerCase()
      } else {
        res.status(400).json({ error: { code: 'HASH_OR_FILE_REQUIRED', message: 'Provide a file or sha256Hash.' } })
        return
      }

      const duplicateResult = await checkFileDuplicate(prisma, userId, hash)
      res.json({
        ok: true,
        result: duplicateResult,
      })
    } catch (error) {
      next(error)
    }
  }
)

// ----------------------------------------------------
// 5. DOCUMENT CONTENT & METADATA SEARCH
// ----------------------------------------------------
intelligenceRouter.get(
  '/search',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.auth!.userId
      const prisma = getPrismaClient()

      const query = (req.query.query as string) || ''
      const category = req.query.category as string | undefined
      const extension = req.query.extension as string | undefined
      const companyId = req.query.companyId as string | undefined
      const applicationId = req.query.applicationId as string | undefined
      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20

      const searchResult = await searchUserVaultDocuments(prisma, userId, {
        query,
        category,
        extension,
        companyId,
        applicationId,
        page,
        limit,
      })

      res.json({
        ok: true,
        ...searchResult,
      })
    } catch (error) {
      next(error)
    }
  }
)

// ----------------------------------------------------
// 6. SMART REMINDERS & INSIGHTS
// ----------------------------------------------------
intelligenceRouter.get(
  '/insights',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.auth!.userId
      const prisma = getPrismaClient()

      const summary = await generateSmartInsights(prisma, userId)
      res.json({
        ok: true,
        data: summary,
      })
    } catch (error) {
      next(error)
    }
  }
)

