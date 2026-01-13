import { Router } from 'express'
import { 
  authenticateUser, 
  validateBody, 
  verifyResumeOwnership,
  strictAiGenerationRateLimit,
  sanitizeMongoQueries,
  preventXSS,
  asyncHandler,
  successHandler
} from '../middleware'
import { generateResumeSchema } from '../lib/validation'
import { ResumeGenerator } from '../../services/data-generation/resumeGenerator.service'
import { Request, Response } from 'express'
import { DataResponse } from '../middleware'
import { initLogger } from '../../config/winston'

const logger = initLogger('generation.route.ts')
const app = Router()

// Apply security middleware to all routes
app.use(sanitizeMongoQueries)
app.use(preventXSS)

const handleSecureGenerateResume = async (req: Request, res: Response): Promise<void> => {
  logger.info('🚨 Attempting secure resume generation...')

  const { resumeId, jobDescription, format } = req.body

  const result = await ResumeGenerator.generateResume({
    resumeId,
    jobDescription,
    format
  })

  logger.info('🚀 Resume generated successfully!')
  res.locals.result = new DataResponse(result, 'Resume generated successfully')
}

app.post('/resume/generate', 
  strictAiGenerationRateLimit,
  authenticateUser,
  validateBody(generateResumeSchema),
  verifyResumeOwnership,
  asyncHandler(handleSecureGenerateResume),
  successHandler
)

export default app
