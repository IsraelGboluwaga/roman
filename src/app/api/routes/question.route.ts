import { Router } from 'express'
import { handleExtractQuestions, handleGetQuestions } from '../controllers'
import { asyncHandler, successHandler } from '../middleware'

const app = Router()

/**
 * @swagger
 * /api/questions/extract:
 *   post:
 *     summary: Extract interview questions from job posting
 *     description: Analyze job posting content and extract relevant interview questions using AI
 *     tags: [AI Generation]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               jobPosting:
 *                 type: string
 *                 minLength: 50
 *                 description: Complete job posting text or URL
 *                 example: "We are seeking a Senior Software Engineer with 5+ years experience in React, Node.js, and cloud technologies..."
 *               url:
 *                 type: string
 *                 format: uri
 *                 description: URL of the job posting (alternative to jobPosting text)
 *                 example: "https://company.com/careers/senior-engineer"
 *               extractionType:
 *                 type: string
 *                 enum: [behavioral, technical, mixed]
 *                 default: mixed
 *                 description: Type of questions to extract
 *               difficulty:
 *                 type: string
 *                 enum: [easy, medium, hard, mixed]
 *                 default: mixed
 *                 description: Difficulty level of questions to generate
 *               questionCount:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 20
 *                 default: 10
 *                 description: Number of questions to extract/generate
 *             required:
 *               - jobPosting
 *     responses:
 *       200:
 *         description: Questions extracted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 questions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Question ID
 *                       question:
 *                         type: string
 *                         description: Interview question text
 *                       type:
 *                         type: string
 *                         enum: [behavioral, technical]
 *                         description: Question category
 *                       difficulty:
 *                         type: string
 *                         enum: [easy, medium, hard]
 *                         description: Question difficulty
 *                       suggestedAnswerPoints:
 *                         type: array
 *                         items:
 *                           type: string
 *                         description: Key points to address in answer
 *                 extractedSkills:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Skills identified from job posting
 *                 jobInsights:
 *                   type: object
 *                   properties:
 *                     company:
 *                       type: string
 *                       description: Company name (if detected)
 *                     role:
 *                       type: string
 *                       description: Job role/title
 *                     experienceLevel:
 *                       type: string
 *                       description: Required experience level
 *                     keyRequirements:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Top job requirements
 *       400:
 *         description: Invalid job posting or extraction parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: AI extraction rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: AI extraction service error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/extract', asyncHandler(handleExtractQuestions), successHandler)

/**
 * @swagger
 * /api/questions:
 *   get:
 *     summary: Get previously extracted questions
 *     description: Retrieve interview questions from previous extractions
 *     tags: [AI Generation]
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         schema:
 *           type: string
 *         description: Session ID from previous extraction
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [behavioral, technical, mixed]
 *         description: Filter questions by type
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: string
 *           enum: [easy, medium, hard]
 *         description: Filter questions by difficulty
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: Number of questions to return
 *     responses:
 *       200:
 *         description: Questions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 questions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Question ID
 *                       question:
 *                         type: string
 *                         description: Interview question text
 *                       type:
 *                         type: string
 *                         enum: [behavioral, technical]
 *                         description: Question category
 *                       difficulty:
 *                         type: string
 *                         enum: [easy, medium, hard]
 *                         description: Question difficulty
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: Question creation timestamp
 *                 total:
 *                   type: integer
 *                   description: Total number of available questions
 *                 filters:
 *                   type: object
 *                   description: Applied filters
 *       404:
 *         description: No questions found for the given criteria
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/', asyncHandler(handleGetQuestions), successHandler)

export default app