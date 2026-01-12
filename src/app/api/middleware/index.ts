export { authenticateUser, authenticateOptionalUser } from './auth.middleware'
export { verifyResumeOwnership, verifyUserResourceAccess } from './ownership.middleware'
export { validateBody, validateQuery, validateParams, validateRequest } from './validation.middleware'
export { 
  generalRateLimit, 
  aiGenerationRateLimit, 
  strictAiGenerationRateLimit, 
  uploadRateLimit,
  speedLimiter 
} from './rateLimiting.middleware'
export { mongoSanitizer, sanitizeMongoQueries, preventXSS } from './security.middleware'
export { errorHandler, successHandler, notFoundHandler, asyncHandler as legacyAsyncHandler, sanitizeErrorResponse } from './errorHandling.middleware'
export { asyncHandler, SuccessResponse, DataResponse, CreatedResponse, NoContentResponse } from './asyncHandler.middleware'
export type { AuthenticatedRequest } from './auth.middleware'