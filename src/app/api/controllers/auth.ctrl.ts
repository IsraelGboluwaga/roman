import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { initLogger } from '../../config/winston'
import { RomanAPIError } from '../../handlers/errors'
import { getUser, getUserByEmail } from '../../services/business-logic/user.service'
import { JWTUtil } from '../../utils/jwt.util'
import { DataResponse } from '../middleware'

const logger = initLogger('auth.ctrl.ts')

export const handleLogin = async (req: Request, res: Response): Promise<void> => {
  logger.info('🚨 Attempting user login...')
  
  const { email } = req.body

  if (!email) {
    throw new RomanAPIError({
      message: 'Email is required',
      status: StatusCodes.BAD_REQUEST,
    })
  }

  const user = await getUserByEmail(email)
  
  if (!user) {
    throw new RomanAPIError({
      message: 'User not found',
      status: StatusCodes.NOT_FOUND,
    })
  }

  const token = JWTUtil.generateToken({
    userId: user.userId,
    email: user.email,
    googleId: user.googleId
  })

  const responseData = {
    token,
    user: {
      id: user.id,
      email: user.email,
      userId: user.userId,
      googleId: user.googleId
    }
  }

  logger.info('🚀 User login successful!')
  res.locals.result = new DataResponse(responseData, 'Login successful')
}

export const handleRefreshToken = async (req: Request, res: Response): Promise<void> => {
  logger.info('🚨 Attempting token refresh...')
  
  const authHeader = req.headers.authorization

  if (!authHeader) {
    throw new RomanAPIError({
      message: 'Authorization header required',
      status: StatusCodes.BAD_REQUEST,
    })
  }

  const token = JWTUtil.extractTokenFromHeader(authHeader)
  const newToken = JWTUtil.refreshToken(token)

  logger.info('🚀 Token refresh successful!')
  res.locals.result = new DataResponse({ token: newToken }, 'Token refreshed successfully')
}

export const handleVerifyToken = async (req: Request, res: Response): Promise<void> => {
  logger.info('🚨 Attempting token verification...')
  
  const authHeader = req.headers.authorization

  if (!authHeader) {
    throw new RomanAPIError({
      message: 'Authorization header required',
      status: StatusCodes.BAD_REQUEST,
    })
  }

  const token = JWTUtil.extractTokenFromHeader(authHeader)
  const decoded = JWTUtil.verifyToken(token)

  // Verify user still exists
  const user = await getUserByEmail(decoded.email)
  
  if (!user || user.userId !== decoded.userId) {
    throw new RomanAPIError({
      message: 'User no longer exists',
      status: StatusCodes.UNAUTHORIZED,
    })
  }

  const responseData = {
    valid: true,
    user: {
      id: user.id,
      email: user.email,
      userId: user.userId,
      googleId: user.googleId
    }
  }

  logger.info('🚀 Token verification successful!')
  res.locals.result = new DataResponse(responseData, 'Token is valid')
}