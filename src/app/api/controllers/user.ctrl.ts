import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { initLogger } from '../../config/winston'
import { RomanAPIError } from '../../handlers/errors'
import { createUser, getUser } from '../../services/business-logic/user.service'
import { CreatedResponse, DataResponse } from '../middleware'

const logger = initLogger('user.ctrl.ts')

export const handleCreateUser = async (req: Request, res: Response): Promise<void> => {
  logger.info('🚨 Attempting to create user...')
  
  const { email, googleId, tempUserId } = req.body

  if (!email) {
    throw new RomanAPIError({
      message: 'email is required',
      status: StatusCodes.BAD_REQUEST,
    })
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw new RomanAPIError({
      message: 'Invalid email format',
      status: StatusCodes.BAD_REQUEST,
    })
  }

  // Create user
  const user = await createUser({
    email,
    googleId,
    tempUserId
  })

  logger.info('🚀 User created successfully!')
  res.locals.result = new CreatedResponse(user, 'User created successfully')
}

export const handleGetUser = async (req: Request, res: Response): Promise<void> => {
  logger.info('🚨 Attempting to fetch user...')

  const { userId } = req.query

  if (!userId) {
    throw new RomanAPIError({
      message: 'userId is required',
      status: StatusCodes.BAD_REQUEST,
    })
  }

  // Fetch user
  const user = await getUser({
    userId: userId as string
  })

  if (!user) {
    throw new RomanAPIError({
      message: 'User not found',
      status: StatusCodes.NOT_FOUND,
    })
  }

  logger.info('🚀 User fetched successfully!')
  res.locals.result = new DataResponse(user)
}

export const handleGoogleOAuth = async (req: Request, res: Response): Promise<void> => {
  logger.info('🚨 Attempting Google OAuth authentication...')
  
  const { googleId, email, tempUserId } = req.body

  if (!googleId || !email) {
    throw new RomanAPIError({
      message: 'googleId and email are required for OAuth authentication',
      status: StatusCodes.BAD_REQUEST,
    })
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw new RomanAPIError({
      message: 'Invalid email format',
      status: StatusCodes.BAD_REQUEST,
    })
  }

  // Create or get user with Google OAuth
  const user = await createUser({
    email,
    googleId,
    tempUserId
  })

  logger.info('🚀 Google OAuth authentication successful!')
  res.locals.result = new DataResponse(user, 'Authentication successful')
}
