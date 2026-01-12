import { StatusCodes } from 'http-status-codes'

/**
 * @extends Error
 */
class ExtendableError extends Error {
  public readonly errors: any
  public readonly status: number
  public readonly code: string
  public readonly userMessage: string
  public readonly isOperational: boolean
  public readonly context?: Record<string, any>
  
  constructor({ message, errors, status, stack, code, userMessage, context }: RomanAPIErrorOptions) {
    super(message)
    this.name = this.constructor.name
    this.message = message
    this.errors = errors
    this.status = status || StatusCodes.INTERNAL_SERVER_ERROR
    this.code = code || 'INTERNAL_ERROR'
    this.userMessage = userMessage || 'An unexpected error occurred'
    this.isOperational = true
    this.context = context
    this.stack = stack
    Object.setPrototypeOf(this, ExtendableError.prototype)
    Error.captureStackTrace(this, ExtendableError)
  }

  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      userMessage: this.userMessage,
      code: this.code,
      status: this.status,
      errors: this.errors,
      context: this.context,
      isOperational: this.isOperational,
      stack: this.stack,
    }
  }
}

interface RomanAPIErrorOptions {
  message: string
  errors?: any
  stack?: any
  status?: number
  code?: string
  userMessage?: string
  context?: Record<string, any>
}

export class RomanAPIError extends ExtendableError {
  /**
   * Creates an API error.
   * @param {string} message - Error message.
   * @param errors
   * @param stack
   * @param {number} status - HTTP status code of error.
   */
  constructor({
    message,
    errors,
    stack,
    status = StatusCodes.INTERNAL_SERVER_ERROR,
    code = 'INTERNAL_ERROR',
    userMessage = 'An unexpected error occurred',
    context,
  }: RomanAPIErrorOptions) {
    if (!message || message.trim() === '') {
      throw new Error('Error message is required')
    }
    
    super({
      message,
      errors,
      status,
      stack,
      code,
      userMessage,
      context,
    })
  }
}

// Specific Error Classes
export class ValidationError extends RomanAPIError {
  constructor(field: string, value?: any, customMessage?: string) {
    const message = customMessage || `Invalid value for field: ${field}`
    const userMessage = `Please check the ${field} field and try again`
    
    super({
      message,
      status: StatusCodes.BAD_REQUEST,
      code: 'VALIDATION_ERROR',
      userMessage,
      context: { field, value },
    })
  }
}

export class NotFoundError extends RomanAPIError {
  constructor(resource: string, identifier?: string) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`
    const userMessage = `The requested ${resource.toLowerCase()} could not be found`
    
    super({
      message,
      status: StatusCodes.NOT_FOUND,
      code: 'RESOURCE_NOT_FOUND',
      userMessage,
      context: { resource, identifier },
    })
  }
}

export class AuthenticationError extends RomanAPIError {
  constructor(message = 'Authentication failed') {
    super({
      message,
      status: StatusCodes.UNAUTHORIZED,
      code: 'AUTHENTICATION_ERROR',
      userMessage: 'Authentication is required to access this resource',
    })
  }
}

export class AuthorizationError extends RomanAPIError {
  constructor(resource?: string) {
    const message = resource 
      ? `Insufficient permissions to access ${resource}`
      : 'Insufficient permissions'
    
    super({
      message,
      status: StatusCodes.FORBIDDEN,
      code: 'AUTHORIZATION_ERROR',
      userMessage: 'You do not have permission to perform this action',
      context: { resource },
    })
  }
}

export class RateLimitError extends RomanAPIError {
  constructor(limit: number, windowMs: number) {
    super({
      message: `Rate limit exceeded: ${limit} requests per ${windowMs}ms`,
      status: StatusCodes.TOO_MANY_REQUESTS,
      code: 'RATE_LIMIT_EXCEEDED',
      userMessage: 'Too many requests. Please try again later.',
      context: { limit, windowMs },
    })
  }
}
