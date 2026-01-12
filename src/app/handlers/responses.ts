import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { RomanAPIError } from './errors'

const SUCCESSFUL = 'Operation completed successfully'
const ERROR_OCCURRED = 'An error occurred while processing your request'

interface ErrorDetail {
  code: string
  message: string
  userMessage: string
  context?: Record<string, any>
}

interface StandardResponse {
  success: boolean
  data?: any
  message: string
  error?: ErrorDetail
}

interface SuccessOptions {
  res: express.Response
  data?: any
  message?: string
  httpCode?: number
}

interface FailureOptions {
  res: express.Response
  error?: RomanAPIError | Error | any
  message?: string
  httpCode?: number
  showStack?: boolean
}

function validateResponse(response: StandardResponse): void {
  if (typeof response.success !== 'boolean') {
    throw new Error('Response must have a boolean success field')
  }
  if (!response.message || typeof response.message !== 'string') {
    throw new Error('Response must have a non-empty message string')
  }
}


function respond(res: express.Response, response: StandardResponse, httpCode: number): void {
  try {
    validateResponse(response)
    res.setHeader('Content-Type', 'application/json')
    res.status(httpCode).json(response)
  } catch (error) {
    // Fallback response if validation fails
    const fallbackResponse: StandardResponse = {
      success: false,
      message: 'Internal server error - invalid response format',
    }
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(fallbackResponse)
  }
}

export const success = ({ res, data, message, httpCode = StatusCodes.OK }: SuccessOptions): void => {
  const response: StandardResponse = {
    success: true,
    data,
    message: message ?? SUCCESSFUL,
  }
  
  return respond(res, response, httpCode)
}

export const failure = ({ res, error, message, httpCode }: FailureOptions): void => {
  let errorDetail: ErrorDetail | undefined
  let finalMessage = message ?? ERROR_OCCURRED
  let finalHttpCode = httpCode ?? StatusCodes.INTERNAL_SERVER_ERROR

  // Handle RomanAPIError instances
  if (error instanceof RomanAPIError) {
    errorDetail = {
      code: error.code,
      message: error.message,
      userMessage: error.userMessage,
      context: error.context,
    }
    finalMessage = error.userMessage
    finalHttpCode = error.status
  } else if (error instanceof Error) {
    // Handle standard Error instances
    errorDetail = {
      code: 'UNKNOWN_ERROR',
      message: error.message,
      userMessage: 'An unexpected error occurred',
    }
    if (process.env.NODE_ENV === 'development') {
      errorDetail.context = { stack: error.stack }
    }
  } else if (error && typeof error === 'object') {
    // Handle generic error objects
    errorDetail = {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || 'Unknown error',
      userMessage: error.userMessage || 'An unexpected error occurred',
      context: error.context,
    }
  }

  const response: StandardResponse = {
    success: false,
    message: finalMessage,
    error: errorDetail,
  }

  return respond(res, response, finalHttpCode)
}