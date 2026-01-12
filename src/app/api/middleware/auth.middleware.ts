import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { initLogger } from '../../config/winston'
import { RomanAPIError } from '../../handlers/errors'
import { getUserByEmail } from '../../services/business-logic/user.service'
import { JWTUtil, TokenPayload } from '../../utils/jwt.util'

const logger = initLogger('auth.middleware.ts')

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    userId: string
    googleId?: string
  }
}

export const authenticateUser = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    logger.info('Authenticating user request with JWT...')
    
    const authHeader = req.headers.authorization
    
    if (!authHeader) {
      throw new RomanAPIError({
        message: 'Authorization header required. Please include Bearer token.',
        status: StatusCodes.UNAUTHORIZED
      })
    }
    
    const token = JWTUtil.extractTokenFromHeader(authHeader)
    const decoded = JWTUtil.verifyToken(token)
    
    // Verify user still exists in database
    const user = await getUserByEmail(decoded.email)
    
    if (!user) {
      throw new RomanAPIError({
        message: 'User no longer exists.',
        status: StatusCodes.UNAUTHORIZED
      })
    }
    
    if (user.userId !== decoded.userId) {
      throw new RomanAPIError({
        message: 'Token user ID mismatch.',
        status: StatusCodes.UNAUTHORIZED
      })
    }
    
    // Store user data in res.locals for access in controllers
    res.locals.user = {
      id: user.id,
      email: user.email,
      userId: user.userId,
      googleId: user.googleId
    }
    
    // Also set on req for backward compatibility during transition
    req.user = res.locals.user
    
    logger.info(`User authenticated successfully via JWT: ${user.email}`)
    next()
    
  } catch (error) {
    logger.error(`JWT authentication failed: ${error}`)
    
    if (error instanceof RomanAPIError) {
      res.status(error.status).json({
        success: false,
        message: error.message,
        error: 'Authentication failed'
      })
      return
    }
    
    let message = 'Authentication failed'
    let status = StatusCodes.UNAUTHORIZED
    
    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        message = 'Token has expired. Please login again.'
      } else if (error.message.includes('invalid') || error.message.includes('malformed')) {
        message = 'Invalid token format.'
      } else if (error.message.includes('Authorization header')) {
        message = error.message
        status = StatusCodes.BAD_REQUEST
      }
    }
    
    res.status(status).json({
      success: false,
      message,
      error: 'Authentication failed'
    })
  }
}

export const authenticateOptionalUser = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader) {
      logger.info('No authorization header provided, proceeding as anonymous')
      return next()
    }
    
    try {
      const token = JWTUtil.extractTokenFromHeader(authHeader)
      const decoded = JWTUtil.verifyToken(token)
      
      const user = await getUserByEmail(decoded.email)
      
      if (user && user.userId === decoded.userId) {
        res.locals.user = {
          id: user.id,
          email: user.email,
          userId: user.userId,
          googleId: user.googleId
        }
        
        req.user = res.locals.user
        logger.info(`Optional user authenticated via JWT: ${user.email}`)
      } else {
        logger.warn('Invalid optional JWT credentials, proceeding as anonymous')
      }
      
    } catch (tokenError) {
      logger.info('Invalid optional token, proceeding as anonymous')
    }
    
    next()
    
  } catch (error) {
    logger.error(`Optional authentication error: ${error}`)
    next()
  }
}