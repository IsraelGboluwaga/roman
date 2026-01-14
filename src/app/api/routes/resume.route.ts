import { Router } from 'express'
import { z } from 'zod'
import { handleAddResume, handleGetResume, handleGenerateResume, handleGetActiveResume, handleGetAllResumes, handleSetActiveResume, handleDeleteResume } from '../controllers'
import { 
  authenticateUser, 
  authenticateOptionalUser, 
  verifyResumeOwnership, 
  verifyUserResourceAccess,
  validateBody,
  validateQuery,
  validateParams,
  validateRequest,
  generalRateLimit,
  aiGenerationRateLimit,
  uploadRateLimit,
  sanitizeMongoQueries,
  preventXSS,
  asyncHandler,
  successHandler
} from '../middleware'
import { 
  addResumeSchema,
  getResumeSchema,
  generateResumeSchema,
  getActiveResumeSchema,
  getAllResumesSchema,
  setActiveResumeSchema,
  deleteResumeSchema,
  legacyGenerateResumeSchema
} from '../lib/validation'

const app = Router()

// Apply security middleware to all routes
app.use(sanitizeMongoQueries)
app.use(preventXSS)
app.use(generalRateLimit)

/**
 * @swagger
 * /api/resumes/add:
 *   post:
 *     summary: Upload and parse resume
 *     description: Upload a resume file (PDF, DOCX, DOC, or image) for parsing and storage
 *     tags: [Resume Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Resume file (PDF, DOCX, DOC, PNG, JPEG)
 *               title:
 *                 type: string
 *                 description: Resume title
 *                 example: "Software Engineer Resume"
 *             required:
 *               - file
 *     responses:
 *       201:
 *         description: Resume uploaded and parsed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Resume'
 *       400:
 *         description: Invalid file format or upload error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Upload rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/add', 
  uploadRateLimit,
  authenticateUser,
  validateBody(addResumeSchema),
  verifyUserResourceAccess,
  asyncHandler(handleAddResume),
  successHandler
)

/**
 * @swagger
 * /api/resumes/active:
 *   get:
 *     summary: Get user's active resume
 *     description: Retrieve the currently active resume for the authenticated user
 *     tags: [Resume Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: User ID (optional, defaults to authenticated user)
 *     responses:
 *       200:
 *         description: Active resume retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Resume'
 *       404:
 *         description: No active resume found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/active', 
  authenticateUser,
  validateQuery(getActiveResumeSchema),
  verifyUserResourceAccess,
  asyncHandler(handleGetActiveResume),
  successHandler
)

/**
 * @swagger
 * /api/resumes/all:
 *   get:
 *     summary: Get all user resumes
 *     description: Retrieve all resumes for the authenticated user
 *     tags: [Resume Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: User ID (optional, defaults to authenticated user)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of resumes to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of resumes to skip
 *     responses:
 *       200:
 *         description: Resumes retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resumes:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Resume'
 *                 total:
 *                   type: integer
 *                   description: Total number of resumes
 *                 limit:
 *                   type: integer
 *                 offset:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/all', 
  authenticateUser,
  validateQuery(getAllResumesSchema),
  verifyUserResourceAccess,
  asyncHandler(handleGetAllResumes),
  successHandler
)

/**
 * @swagger
 * /api/resumes/generate:
 *   post:
 *     summary: Generate AI-optimized resume
 *     description: Create a tailored resume using AI based on job description and original resume
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
 *               jobDescription:
 *                 type: string
 *                 description: Target job description for optimization
 *                 example: "We are looking for a Senior Software Engineer with experience in React, Node.js..."
 *               resumeId:
 *                 type: string
 *                 description: ID of the resume to optimize (optional, uses active resume if not provided)
 *               format:
 *                 type: string
 *                 enum: [pdf, docx]
 *                 default: pdf
 *                 description: Output document format
 *               optimizationLevel:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 default: 3
 *                 description: Intensity of AI optimization (1=minimal, 5=extensive)
 *             required:
 *               - jobDescription
 *     responses:
 *       201:
 *         description: Optimized resume generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OptimizedResume'
 *       400:
 *         description: Invalid request or missing resume
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: AI generation rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/generate', 
  aiGenerationRateLimit,
  authenticateOptionalUser,
  validateBody(legacyGenerateResumeSchema),
  asyncHandler(handleGenerateResume),
  successHandler
)

/**
 * @swagger
 * /api/resumes/{id}:
 *   get:
 *     summary: Get specific resume
 *     description: Retrieve a specific resume by ID
 *     tags: [Resume Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Resume ID
 *     responses:
 *       200:
 *         description: Resume retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Resume'
 *       404:
 *         description: Resume not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized or not resume owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/:id', 
  authenticateUser,
  validateParams(z.object({ id: z.string().min(1, 'Resume ID is required') })),
  verifyResumeOwnership,
  asyncHandler(handleGetResume),
  successHandler
)

/**
 * @swagger
 * /api/resumes/{id}/activate:
 *   put:
 *     summary: Set resume as active
 *     description: Mark a specific resume as the user's active resume
 *     tags: [Resume Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Resume ID to activate
 *     responses:
 *       200:
 *         description: Resume activated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Resume'
 *       404:
 *         description: Resume not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized or not resume owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.put('/:id/activate', 
  authenticateUser,
  validateRequest(setActiveResumeSchema),
  verifyUserResourceAccess,
  verifyResumeOwnership,
  asyncHandler(handleSetActiveResume),
  successHandler
)

/**
 * @swagger
 * /api/resumes/{id}:
 *   delete:
 *     summary: Delete resume
 *     description: Permanently delete a resume and its associated files
 *     tags: [Resume Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Resume ID to delete
 *     responses:
 *       200:
 *         description: Resume deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Resume deleted successfully
 *                 deletedId:
 *                   type: string
 *                   description: ID of the deleted resume
 *       404:
 *         description: Resume not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized or not resume owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.delete('/:id', 
  authenticateUser,
  validateRequest(deleteResumeSchema),
  verifyUserResourceAccess,
  verifyResumeOwnership,
  asyncHandler(handleDeleteResume),
  successHandler
)

export default app