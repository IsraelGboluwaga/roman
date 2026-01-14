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

/**
 * @swagger
 * /api/generation/resume/generate:
 *   post:
 *     summary: Generate secure AI-optimized resume
 *     description: Create a highly secure, tailored resume using advanced AI processing with authenticated user verification
 *     tags: [AI Generation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               resumeId:
 *                 type: string
 *                 description: ID of the resume to optimize (must belong to authenticated user)
 *                 example: 60f1b2b3c4d5e6f7a8b9c0d1
 *               jobDescription:
 *                 type: string
 *                 minLength: 10
 *                 description: Target job description for AI optimization
 *                 example: "Senior Software Engineer position requiring expertise in React, Node.js, TypeScript, and cloud technologies. Experience with microservices architecture and CI/CD pipelines preferred."
 *               format:
 *                 type: string
 *                 enum: [pdf, docx]
 *                 default: pdf
 *                 description: Output document format
 *               optimizationOptions:
 *                 type: object
 *                 properties:
 *                   industry:
 *                     type: string
 *                     description: Target industry for optimization
 *                     example: technology
 *                   experienceLevel:
 *                     type: string
 *                     enum: [entry, mid, senior, executive]
 *                     description: Target experience level
 *                   keywords:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: Additional keywords to emphasize
 *                     example: ["React", "TypeScript", "AWS"]
 *                 description: Advanced optimization settings
 *             required:
 *               - resumeId
 *               - jobDescription
 *     responses:
 *       201:
 *         description: Secure resume generation completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Resume generated successfully
 *                 generatedResume:
 *                   $ref: '#/components/schemas/OptimizedResume'
 *                 downloadUrl:
 *                   type: string
 *                   format: uri
 *                   description: Secure download URL for the generated resume
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *                   description: Download URL expiration timestamp
 *                 processingTime:
 *                   type: number
 *                   description: AI processing time in milliseconds
 *       400:
 *         description: Invalid request or resume validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               invalidResume:
 *                 summary: Resume not found or invalid
 *                 value:
 *                   message: Resume not found or does not belong to user
 *                   status: 400
 *               jobDescriptionTooShort:
 *                 summary: Job description too short
 *                 value:
 *                   message: Job description must be at least 10 characters
 *                   status: 400
 *       401:
 *         description: Authentication required or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Access denied - resume ownership verification failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: AI generation rate limit exceeded (strict limits apply)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: AI generation rate limit exceeded. Please wait before trying again.
 *               status: 429
 *               retryAfter: 3600
 *       500:
 *         description: AI generation service error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/resume/generate', 
  strictAiGenerationRateLimit,
  authenticateUser,
  validateBody(generateResumeSchema),
  verifyResumeOwnership,
  asyncHandler(handleSecureGenerateResume),
  successHandler
)

export default app
