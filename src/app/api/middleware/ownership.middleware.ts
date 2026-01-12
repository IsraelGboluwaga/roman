import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { initLogger } from '../../config/winston'
import { RomanAPIError } from '../../handlers/errors'
import { getResume } from '../../services/business-logic/resume.service'
import { AuthenticatedRequest } from './auth.middleware'

const logger = initLogger('ownership.middleware.ts')

export const verifyResumeOwnership = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    logger.info('Verifying resume ownership...')
    
    const user = res.locals.user || req.user
    
    if (!user) {
      throw new RomanAPIError({
        message: 'User authentication required for ownership verification',
        status: StatusCodes.UNAUTHORIZED
      })
    }
    
    const resumeId = req.params.id || req.body.resumeId
    
    if (!resumeId) {
      throw new RomanAPIError({
        message: 'Resume ID is required for ownership verification',
        status: StatusCodes.BAD_REQUEST
      })
    }
    
    const resume = await getResume(resumeId)
    
    if (!resume) {
      throw new RomanAPIError({
        message: 'Resume not found',
        status: StatusCodes.NOT_FOUND
      })
    }
    
    if (resume.userId !== user.userId) {
      logger.warn(`User ${user.userId} attempted to access resume ${resumeId} owned by ${resume.userId}`)
      throw new RomanAPIError({
        message: 'Access denied. Resume does not belong to authenticated user.',
        status: StatusCodes.FORBIDDEN
      })
    }
    
    logger.info(`Resume ownership verified for user ${user.userId}`)
    next()
    
  } catch (error) {
    logger.error(`Ownership verification failed: ${error}`)
    
    if (error instanceof RomanAPIError) {
      res.status(error.status).json({
        success: false,
        message: error.message,
        error: 'Access denied'
      })
      return
    }
    
    res.status(StatusCodes.FORBIDDEN).json({
      success: false,
      message: 'Access denied',
      error: 'Forbidden'
    })
  }
}

export const verifyUserResourceAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    logger.info('Verifying user resource access...')
    
    const user = res.locals.user || req.user
    
    if (!user) {
      throw new RomanAPIError({
        message: 'User authentication required',
        status: StatusCodes.UNAUTHORIZED
      })
    }
    
    const targetUserId = req.query.userId || req.body.userId || req.params.userId
    
    if (!targetUserId) {
      throw new RomanAPIError({
        message: 'User ID is required for resource access verification',
        status: StatusCodes.BAD_REQUEST
      })
    }
    
    if (user.userId !== targetUserId) {
      logger.warn(`User ${user.userId} attempted to access resources for user ${targetUserId}`)
      throw new RomanAPIError({
        message: 'Access denied. Cannot access other user resources.',
        status: StatusCodes.FORBIDDEN
      })
    }
    
    logger.info(`User resource access verified for user ${user.userId}`)
    next()
    
  } catch (error) {
    logger.error(`User resource access verification failed: ${error}`)
    
    if (error instanceof RomanAPIError) {
      res.status(error.status).json({
        success: false,
        message: error.message,
        error: 'Access denied'
      })
      return
    }
    
    res.status(StatusCodes.FORBIDDEN).json({
      success: false,
      message: 'Access denied',
      error: 'Forbidden'
    })
  }
}