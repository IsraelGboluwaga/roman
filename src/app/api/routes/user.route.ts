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

app.post('/create', 
  validateBody(createUserSchema),
  asyncHandler(handleCreateUser),
  successHandler
)

app.get('/', 
  validateQuery(getUserSchema),
  asyncHandler(handleGetUser),
  successHandler
)

app.post('/oauth/google', 
  validateBody(googleOAuthSchema),
  asyncHandler(handleGoogleOAuth),
  successHandler
)

export default app
