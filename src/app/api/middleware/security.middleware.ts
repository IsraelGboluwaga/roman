import mongoSanitize from 'express-mongo-sanitize'
import { Request, Response, NextFunction } from 'express'
import { initLogger } from '../../config/winston'

const logger = initLogger('security.middleware.ts')

export const mongoSanitizer = mongoSanitize({
  onSanitize: ({ req, key }: { req: Request, key: string }) => {
    logger.warn(`Potential MongoDB injection attempt detected and sanitized. IP: ${req.ip}, Key: ${key}`)
  },
  replaceWith: '_'
})

export const sanitizeMongoQueries = (req: Request, res: Response, next: NextFunction) => {
  try {
    const sanitizeObject = (obj: any): any => {
      if (obj && typeof obj === 'object') {
        if (Array.isArray(obj)) {
          return obj.map(sanitizeObject)
        }
        
        const sanitized: any = {}
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            if (key.startsWith('$') || key.includes('.')) {
              logger.warn(`MongoDB injection attempt blocked: ${key} from IP: ${req.ip}`)
              continue
            }
            sanitized[key] = sanitizeObject(obj[key])
          }
        }
        return sanitized
      }
      return obj
    }
    
    if (req.body) {
      req.body = sanitizeObject(req.body)
    }
    if (req.query) {
      req.query = sanitizeObject(req.query)
    }
    if (req.params) {
      req.params = sanitizeObject(req.params)
    }
    
    next()
  } catch (error) {
    logger.error(`Error in MongoDB sanitization: ${error}`)
    next()
  }
}

export const preventXSS = (req: Request, res: Response, next: NextFunction) => {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi
  ]
  
  const sanitizeString = (str: string): string => {
    let sanitized = str
    xssPatterns.forEach(pattern => {
      if (pattern.test(sanitized)) {
        logger.warn(`XSS attempt detected and blocked from IP: ${req.ip}`)
        sanitized = sanitized.replace(pattern, '')
      }
    })
    return sanitized
  }
  
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizeString(obj)
    }
    if (obj && typeof obj === 'object') {
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject)
      }
      const sanitized: any = {}
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitizeObject(obj[key])
        }
      }
      return sanitized
    }
    return obj
  }
  
  try {
    if (req.body) {
      req.body = sanitizeObject(req.body)
    }
    if (req.query) {
      req.query = sanitizeObject(req.query)
    }
    
    next()
  } catch (error) {
    logger.error(`Error in XSS prevention: ${error}`)
    next()
  }
}