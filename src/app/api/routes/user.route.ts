import { Router } from 'express'
import { handleCreateUser, handleGetUser, handleGoogleOAuth } from '../controllers'
import { 
  validateBody, 
  validateQuery,
  generalRateLimit,
  sanitizeMongoQueries,
  preventXSS,
  asyncHandler,
  successHandler
} from '../middleware'
import { createUserSchema, getUserSchema, googleOAuthSchema } from '../lib/validation'

const app = Router()

// Apply security middleware to all routes
app.use(sanitizeMongoQueries)
app.use(preventXSS)
app.use(generalRateLimit)

/**
 * @swagger
 * /api/users/create:
 *   post:
 *     summary: Create new user account
 *     description: Register a new user with email and password
 *     tags: [User Management]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email address
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: User password (minimum 6 characters)
 *                 example: securePassword123
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 description: User full name
 *                 example: John Doe
 *               confirmPassword:
 *                 type: string
 *                 description: Password confirmation (must match password)
 *                 example: securePassword123
 *             required:
 *               - email
 *               - password
 *               - name
 *               - confirmPassword
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User created successfully
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *                   description: JWT access token for immediate login
 *                 refreshToken:
 *                   type: string
 *                   description: JWT refresh token
 *       400:
 *         description: Validation error or email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               emailExists:
 *                 summary: Email already registered
 *                 value:
 *                   message: Email already exists
 *                   status: 400
 *               passwordMismatch:
 *                 summary: Passwords don't match
 *                 value:
 *                   message: Passwords do not match
 *                   status: 400
 *               weakPassword:
 *                 summary: Password too weak
 *                 value:
 *                   message: Password must be at least 6 characters
 *                   status: 400
 *       429:
 *         description: Too many registration attempts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/create', 
  validateBody(createUserSchema),
  asyncHandler(handleCreateUser),
  successHandler
)

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get user information
 *     description: Retrieve user profile information by user ID or email
 *     tags: [User Management]
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: User ID to retrieve (optional if authenticated)
 *         example: 60f1b2b3c4d5e6f7a8b9c0d1
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *           format: email
 *         description: User email to retrieve (alternative to userId)
 *         example: john.doe@example.com
 *       - in: query
 *         name: includeStats
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include user statistics (resume count, etc.)
 *     responses:
 *       200:
 *         description: User information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalResumes:
 *                       type: integer
 *                       description: Number of uploaded resumes
 *                     generatedResumes:
 *                       type: integer
 *                       description: Number of AI-generated resumes
 *                     lastActivity:
 *                       type: string
 *                       format: date-time
 *                       description: Last user activity timestamp
 *                   description: User statistics (only if includeStats=true)
 *       400:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many requests
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/', 
  validateQuery(getUserSchema),
  asyncHandler(handleGetUser),
  successHandler
)

/**
 * @swagger
 * /api/users/oauth/google:
 *   post:
 *     summary: Google OAuth authentication
 *     description: Authenticate or register user using Google OAuth token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               idToken:
 *                 type: string
 *                 description: Google ID token from Google Sign-In
 *                 example: eyJhbGciOiJSUzI1NiIsImtpZCI6IjdkYzc4MjEyNzFh...
 *               accessToken:
 *                 type: string
 *                 description: Google access token (optional)
 *                 example: ya29.a0ARrdaM-9X8KZY8T4J3X...
 *               deviceInfo:
 *                 type: object
 *                 properties:
 *                   userAgent:
 *                     type: string
 *                     description: User agent string
 *                   platform:
 *                     type: string
 *                     description: Device platform
 *                     example: web
 *                 description: Device information for security logging
 *             required:
 *               - idToken
 *     responses:
 *       200:
 *         description: Google OAuth authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Google OAuth successful
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *                   description: JWT access token
 *                 refreshToken:
 *                   type: string
 *                   description: JWT refresh token
 *                 isNewUser:
 *                   type: boolean
 *                   description: Whether this is a newly registered user
 *       400:
 *         description: Invalid Google token or request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               invalidToken:
 *                 summary: Invalid Google ID token
 *                 value:
 *                   message: Invalid Google ID token
 *                   status: 400
 *               tokenExpired:
 *                 summary: Expired Google token
 *                 value:
 *                   message: Google token has expired
 *                   status: 400
 *       401:
 *         description: Google token verification failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many OAuth attempts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       503:
 *         description: Google OAuth service temporarily unavailable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/oauth/google', 
  validateBody(googleOAuthSchema),
  asyncHandler(handleGoogleOAuth),
  successHandler
)

export default app
