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

app.post('/add', 
  uploadRateLimit,
  authenticateUser,
  validateBody(addResumeSchema),
  verifyUserResourceAccess,
  asyncHandler(handleAddResume),
  successHandler
)

app.get('/:id', 
  authenticateUser,
  validateParams(z.object({ id: z.string().min(1, 'Resume ID is required') })),
  verifyResumeOwnership,
  asyncHandler(handleGetResume),
  successHandler
)

app.get('/active', 
  authenticateUser,
  validateQuery(getActiveResumeSchema),
  verifyUserResourceAccess,
  asyncHandler(handleGetActiveResume),
  successHandler
)

app.get('/all', 
  authenticateUser,
  validateQuery(getAllResumesSchema),
  verifyUserResourceAccess,
  asyncHandler(handleGetAllResumes),
  successHandler
)

app.put('/:id/activate', 
  authenticateUser,
  validateRequest(setActiveResumeSchema),
  verifyUserResourceAccess,
  verifyResumeOwnership,
  asyncHandler(handleSetActiveResume),
  successHandler
)

app.delete('/:id', 
  authenticateUser,
  validateRequest(deleteResumeSchema),
  verifyUserResourceAccess,
  verifyResumeOwnership,
  asyncHandler(handleDeleteResume),
  successHandler
)

app.post('/generate', 
  aiGenerationRateLimit,
  authenticateOptionalUser,
  validateBody(legacyGenerateResumeSchema),
  asyncHandler(handleGenerateResume),
  successHandler
)

export default app