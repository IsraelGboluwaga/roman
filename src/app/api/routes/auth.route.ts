import { Router } from 'express'
import { handleLogin, handleRefreshToken, handleVerifyToken } from '../controllers/auth.ctrl'
import { 
  validateBody,
  generalRateLimit,
  sanitizeMongoQueries,
  preventXSS,
  asyncHandler,
  successHandler
} from '../middleware'
import { loginSchema } from '../lib/validation'

const app = Router()

// Apply security middleware to all routes
app.use(sanitizeMongoQueries)
app.use(preventXSS)
app.use(generalRateLimit)

app.post('/login', 
  validateBody(loginSchema),
  asyncHandler(handleLogin),
  successHandler
)

app.post('/refresh', 
  asyncHandler(handleRefreshToken),
  successHandler
)

app.get('/verify', 
  asyncHandler(handleVerifyToken),
  successHandler
)

export default app