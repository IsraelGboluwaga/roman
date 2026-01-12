import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { z, ZodIssue } from 'zod'
import { initLogger } from '../../config/winston'
import { RomanAPIError } from '../../handlers/errors'

const logger = initLogger('validation.middleware.ts')

interface RequestValidationData {
  body?: unknown
  query?: unknown  
  params?: unknown
}

export const validateBody = <T extends z.ZodTypeAny>(schema: T) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      logger.info('Validating request body...')
      
      const result = schema.safeParse(req.body)
      
      if (!result.success) {
        const errorMessages = result.error.issues.map((err: ZodIssue) => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ')
        
        logger.warn(`Body validation failed: ${errorMessages}`)
        
        throw new RomanAPIError({
          message: `Invalid request body: ${errorMessages}`,
          status: StatusCodes.BAD_REQUEST
        })
      }
      
      req.body = result.data
      logger.info('Request body validation successful')
      next()
      
    } catch (error) {
      logger.error(`Body validation error: ${error}`)
      
      if (error instanceof RomanAPIError) {
        res.status(error.status).json({
          success: false,
          message: error.message,
          error: 'Validation failed'
        })
        return
      }
      
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid request body',
        error: 'Validation failed'
      })
    }
  }
}

export const validateQuery = <T extends z.ZodTypeAny>(schema: T) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      logger.info('Validating request query...')
      
      const result = schema.safeParse(req.query)
      
      if (!result.success) {
        const errorMessages = result.error.issues.map((err: ZodIssue) => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ')
        
        logger.warn(`Query validation failed: ${errorMessages}`)
        
        throw new RomanAPIError({
          message: `Invalid query parameters: ${errorMessages}`,
          status: StatusCodes.BAD_REQUEST
        })
      }
      
      req.query = result.data as typeof req.query
      logger.info('Request query validation successful')
      next()
      
    } catch (error) {
      logger.error(`Query validation error: ${error}`)
      
      if (error instanceof RomanAPIError) {
        res.status(error.status).json({
          success: false,
          message: error.message,
          error: 'Validation failed'
        })
        return
      }
      
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid query parameters',
        error: 'Validation failed'
      })
    }
  }
}

export const validateParams = <T extends z.ZodTypeAny>(schema: T) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      logger.info('Validating request params...')
      
      const result = schema.safeParse(req.params)
      
      if (!result.success) {
        const errorMessages = result.error.issues.map((err: ZodIssue) => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ')
        
        logger.warn(`Params validation failed: ${errorMessages}`)
        
        throw new RomanAPIError({
          message: `Invalid URL parameters: ${errorMessages}`,
          status: StatusCodes.BAD_REQUEST
        })
      }
      
      req.params = result.data as typeof req.params
      logger.info('Request params validation successful')
      next()
      
    } catch (error) {
      logger.error(`Params validation error: ${error}`)
      
      if (error instanceof RomanAPIError) {
        res.status(error.status).json({
          success: false,
          message: error.message,
          error: 'Validation failed'
        })
        return
      }
      
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid URL parameters',
        error: 'Validation failed'
      })
    }
  }
}

export const validateRequest = <T extends z.ZodTypeAny>(schema: T) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      logger.info('Validating full request...')
      
      const requestData = {
        body: req.body,
        query: req.query,
        params: req.params
      }
      
      const result = schema.safeParse(requestData)
      
      if (!result.success) {
        const errorMessages = result.error.issues.map((err: ZodIssue) => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ')
        
        logger.warn(`Request validation failed: ${errorMessages}`)
        
        throw new RomanAPIError({
          message: `Invalid request: ${errorMessages}`,
          status: StatusCodes.BAD_REQUEST
        })
      }
      
      const validatedData = result.data as RequestValidationData
      req.body = validatedData.body || req.body
      req.query = (validatedData.query as typeof req.query) || req.query
      req.params = (validatedData.params as typeof req.params) || req.params
      
      logger.info('Full request validation successful')
      next()
      
    } catch (error) {
      logger.error(`Request validation error: ${error}`)
      
      if (error instanceof RomanAPIError) {
        res.status(error.status).json({
          success: false,
          message: error.message,
          error: 'Validation failed'
        })
        return
      }
      
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid request',
        error: 'Validation failed'
      })
    }
  }
}