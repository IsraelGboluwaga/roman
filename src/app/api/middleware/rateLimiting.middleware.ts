import rateLimit from 'express-rate-limit'
import slowDown from 'express-slow-down'
import { Request, Response } from 'express'
import { initLogger } from '../../config/winston'

const logger = initLogger('rateLimiting.middleware.ts')

export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    error: 'Rate limit exceeded'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`)
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      error: 'Rate limit exceeded'
    })
  }
})

export const aiGenerationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each authenticated user to 10 AI generations per hour
  message: {
    success: false,
    message: 'AI generation rate limit exceeded. Please try again later.',
    error: 'Rate limit exceeded'
  },
  keyGenerator: (req: any) => {
    // Only rate limit by userId for authenticated users
    // For unauthenticated users, use a shared key (they'll share the limit)
    return req.user?.userId || 'unauthenticated'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    const userId = (req as any).user?.userId || 'anonymous'
    logger.warn(`AI generation rate limit exceeded for user: ${userId}, IP: ${req.ip}`)
    res.status(429).json({
      success: false,
      message: 'AI generation rate limit exceeded. You can generate up to 10 resumes per hour.',
      error: 'Rate limit exceeded'
    })
  }
})

export const strictAiGenerationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit to 5 for authenticated secure endpoint
  message: {
    success: false,
    message: 'Secure AI generation rate limit exceeded. Please try again later.',
    error: 'Rate limit exceeded'
  },
  keyGenerator: (req: any) => {
    // Only rate limit by userId for authenticated users
    // For unauthenticated users, use a shared key (they'll share the limit)
    return req.user?.userId || 'unauthenticated'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    const userId = (req as any).user?.userId || 'anonymous'
    logger.warn(`Secure AI generation rate limit exceeded for user: ${userId}, IP: ${req.ip}`)
    res.status(429).json({
      success: false,
      message: 'Secure AI generation rate limit exceeded. You can generate up to 5 resumes per hour using this endpoint.',
      error: 'Rate limit exceeded'
    })
  }
})

export const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each user to 5 uploads per 15 minutes
  message: {
    success: false,
    message: 'Upload rate limit exceeded. Please try again later.',
    error: 'Rate limit exceeded'
  },
  keyGenerator: (req: any) => {
    // Only rate limit by userId for authenticated users
    // For unauthenticated users, use a shared key (they'll share the limit)
    return req.user?.userId || 'unauthenticated'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    const userId = (req as any).user?.userId || 'anonymous'
    logger.warn(`Upload rate limit exceeded for user: ${userId}, IP: ${req.ip}`)
    res.status(429).json({
      success: false,
      message: 'Upload rate limit exceeded. You can upload up to 5 resumes per 15 minutes.',
      error: 'Rate limit exceeded'
    })
  }
})

export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow first 50 requests at full speed
  delayMs: (hits: number) => hits * 100, // add 100ms delay per request after delayAfter
  maxDelayMs: 5000 // max 5 second delay
})