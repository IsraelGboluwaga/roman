import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { initLogger } from '../../config/winston'
import { RomanAPIError } from '../../handlers/errors'

const logger = initLogger('errorHandling.middleware.ts')

interface SanitizedError {
  success: false
  message: string
  error: string
  timestamp: string
  requestId?: string
}

export const sanitizeErrorResponse = (error: any, isProduction = process.env.NODE_ENV === 'production'): SanitizedError => {
  const sanitized: SanitizedError = {
    success: false,
    message: 'An error occurred',
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  }
  
  if (error instanceof RomanAPIError) {
    sanitized.message = error.message
    sanitized.error = 'Application error'
    return sanitized
  }
  
  if (error.name === 'ValidationError') {
    sanitized.message = 'Validation failed'
    sanitized.error = 'Validation error'
    return sanitized
  }
  
  if (error.name === 'CastError') {
    sanitized.message = 'Invalid data format'
    sanitized.error = 'Data format error'
    return sanitized
  }
  
  if (error.code === 11000) {
    sanitized.message = 'Duplicate entry'
    sanitized.error = 'Duplicate data'
    return sanitized
  }
  
  if (error.name === 'MongoError' || error.name === 'MongoServerError') {
    sanitized.message = 'Database operation failed'
    sanitized.error = 'Database error'
    return sanitized
  }
  
  if (error.code === 'ECONNREFUSED') {
    sanitized.message = 'Service temporarily unavailable'
    sanitized.error = 'Connection error'
    return sanitized
  }
  
  if (error.code === 'ETIMEDOUT') {
    sanitized.message = 'Request timeout'
    sanitized.error = 'Timeout error'
    return sanitized
  }
  
  if (!isProduction && error.message) {
    sanitized.message = error.message
  }
  
  return sanitized
}

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId = req.headers['x-request-id'] as string || `req_${Date.now()}`
  
  logger.error(`Error in ${req.method} ${req.path}:`, {
    error: error.message,
    stack: error.stack,
    requestId,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: res.locals.user?.userId || (req as any).user?.userId
  })
  
  let statusCode = StatusCodes.INTERNAL_SERVER_ERROR
  
  if (error instanceof RomanAPIError) {
    statusCode = error.status
  } else if (error.name === 'ValidationError') {
    statusCode = StatusCodes.BAD_REQUEST
  } else if (error.name === 'CastError') {
    statusCode = StatusCodes.BAD_REQUEST
  } else if (error.code === 11000) {
    statusCode = StatusCodes.CONFLICT
  } else if (error.name === 'MongoError' || error.name === 'MongoServerError') {
    statusCode = StatusCodes.SERVICE_UNAVAILABLE
  }
  
  const sanitizedError = sanitizeErrorResponse(error)
  sanitizedError.requestId = requestId
  
  res.status(statusCode).json(sanitizedError)
}

export const successHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Check if response was already sent (shouldn't happen but safety check)
  if (res.headersSent) {
    return next()
  }
  
  // Check if res.locals has success response data
  const result = res.locals.result
  
  if (result && typeof result === 'object') {
    // Handle success response classes
    if (result.constructor.name.includes('Response')) {
      res.status(result.statusCode || 200).json({
        success: true,
        data: result.data,
        message: result.message,
        timestamp: new Date().toISOString()
      })
      return
    }
    
    // Handle raw data response
    res.status(200).json({
      success: true,
      data: result,
      message: 'Operation completed successfully',
      timestamp: new Date().toISOString()
    })
    return
  }
  
  next()
}

export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  logger.warn(`Route not found: ${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  })
  
  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    message: 'Route not found',
    error: 'Not found',
    timestamp: new Date().toISOString()
  })
}

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}