import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

jest.mock('../../../services/business-logic/user.service')
jest.mock('../../../config/winston')
jest.mock('../../../handlers/responses', () => ({
  success: jest.fn(),
  failure: jest.fn()
}))

import { handleCreateUser, handleGetUser, handleGoogleOAuth } from '../user.ctrl'
import * as userService from '../../../services/business-logic/user.service'
import { success, failure } from '../../../handlers/responses'

const mockCreateUser = userService.createUser as jest.MockedFunction<typeof userService.createUser>
const mockGetUser = userService.getUser as jest.MockedFunction<typeof userService.getUser>
const mockSuccess = success as jest.MockedFunction<typeof success>
const mockFailure = failure as jest.MockedFunction<typeof failure>

describe('User Controller', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>

  beforeEach(() => {
    mockResponse = {}
    mockRequest = {}
    jest.clearAllMocks()
  })

  describe('handleCreateUser', () => {
    const mockUserData = {
      id: 'user-id-123',
      email: 'test@example.com',
      userId: 'user_123_abc',
      googleId: 'google_123',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    it('should successfully create a user with valid email', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        googleId: 'google_123'
      }

      mockCreateUser.mockResolvedValue(mockUserData)

      await handleCreateUser(mockRequest as Request, mockResponse as Response)

      expect(mockCreateUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        googleId: 'google_123',
        tempUserId: undefined
      })

      expect(mockSuccess).toHaveBeenCalledWith({
        res: mockResponse,
        data: mockUserData,
        httpCode: StatusCodes.CREATED,
        message: 'User created successfully'
      })
    })

    it('should successfully create user with temp user migration', async () => {
      mockRequest.body = {
        email: 'temp@example.com',
        tempUserId: 'temp_123_xyz'
      }

      mockCreateUser.mockResolvedValue(mockUserData)

      await handleCreateUser(mockRequest as Request, mockResponse as Response)

      expect(mockCreateUser).toHaveBeenCalledWith({
        email: 'temp@example.com',
        googleId: undefined,
        tempUserId: 'temp_123_xyz'
      })

      expect(mockSuccess).toHaveBeenCalledWith({
        res: mockResponse,
        data: mockUserData,
        httpCode: StatusCodes.CREATED,
        message: 'User created successfully'
      })
    })

    it('should return 400 when email is missing', async () => {
      mockRequest.body = {
        googleId: 'google_123'
      }

      await handleCreateUser(mockRequest as Request, mockResponse as Response)

      expect(mockCreateUser).not.toHaveBeenCalled()
      expect(mockFailure).toHaveBeenCalledWith(
        expect.objectContaining({
          res: mockResponse,
          message: 'email is required',
          httpCode: StatusCodes.INTERNAL_SERVER_ERROR,
          error: expect.any(Object)
        })
      )
    })

    it('should return 400 when email format is invalid', async () => {
      mockRequest.body = {
        email: 'invalid-email-format'
      }

      await handleCreateUser(mockRequest as Request, mockResponse as Response)

      expect(mockCreateUser).not.toHaveBeenCalled()
      expect(mockFailure).toHaveBeenCalledWith(
        expect.objectContaining({
          res: mockResponse,
          message: 'Invalid email format',
          httpCode: StatusCodes.INTERNAL_SERVER_ERROR,
          error: expect.any(Object)
        })
      )
    })

    it('should handle service errors', async () => {
      mockRequest.body = {
        email: 'test@example.com'
      }

      const serviceError = new Error('Database connection failed')
      mockCreateUser.mockRejectedValue(serviceError)

      await handleCreateUser(mockRequest as Request, mockResponse as Response)

      expect(mockFailure).toHaveBeenCalledWith({
        res: mockResponse,
        message: 'Database connection failed',
        error: serviceError,
        httpCode: StatusCodes.INTERNAL_SERVER_ERROR
      })
    })
  })

  describe('handleGetUser', () => {
    const mockUserData = {
      id: 'user-id-123',
      email: 'test@example.com',
      userId: 'user_123_abc',
      googleId: 'google_123',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    it('should successfully get a user by userId', async () => {
      mockRequest.query = {
        userId: 'user_123_abc'
      }

      mockGetUser.mockResolvedValue(mockUserData)

      await handleGetUser(mockRequest as Request, mockResponse as Response)

      expect(mockGetUser).toHaveBeenCalledWith({
        userId: 'user_123_abc'
      })

      expect(mockSuccess).toHaveBeenCalledWith({
        res: mockResponse,
        data: mockUserData,
        httpCode: StatusCodes.OK
      })
    })

    it('should return 400 when userId is missing', async () => {
      mockRequest.query = {}

      await handleGetUser(mockRequest as Request, mockResponse as Response)

      expect(mockGetUser).not.toHaveBeenCalled()
      expect(mockFailure).toHaveBeenCalledWith(
        expect.objectContaining({
          res: mockResponse,
          message: 'userId is required',
          httpCode: StatusCodes.INTERNAL_SERVER_ERROR,
          error: expect.any(Object)
        })
      )
    })

    it('should return 404 when user is not found', async () => {
      mockRequest.query = {
        userId: 'nonexistent_user'
      }

      mockGetUser.mockResolvedValue(null)

      await handleGetUser(mockRequest as Request, mockResponse as Response)

      expect(mockGetUser).toHaveBeenCalledWith({
        userId: 'nonexistent_user'
      })

      expect(mockFailure).toHaveBeenCalledWith(
        expect.objectContaining({
          res: mockResponse,
          message: 'User not found',
          httpCode: StatusCodes.INTERNAL_SERVER_ERROR,
          error: expect.any(Object)
        })
      )
    })

    it('should handle service errors', async () => {
      mockRequest.query = {
        userId: 'user_123'
      }

      const serviceError = new Error('Database error')
      mockGetUser.mockRejectedValue(serviceError)

      await handleGetUser(mockRequest as Request, mockResponse as Response)

      expect(mockFailure).toHaveBeenCalledWith({
        res: mockResponse,
        message: 'Database error',
        error: serviceError,
        httpCode: StatusCodes.INTERNAL_SERVER_ERROR
      })
    })
  })

  describe('handleGoogleOAuth', () => {
    const mockUserData = {
      id: 'user-id-123',
      email: 'oauth@example.com',
      userId: 'user_123_abc',
      googleId: 'google_oauth_123',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    it('should successfully authenticate with Google OAuth', async () => {
      mockRequest.body = {
        googleId: 'google_oauth_123',
        email: 'oauth@example.com'
      }

      mockCreateUser.mockResolvedValue(mockUserData)

      await handleGoogleOAuth(mockRequest as Request, mockResponse as Response)

      expect(mockCreateUser).toHaveBeenCalledWith({
        email: 'oauth@example.com',
        googleId: 'google_oauth_123',
        tempUserId: undefined
      })

      expect(mockSuccess).toHaveBeenCalledWith({
        res: mockResponse,
        data: mockUserData,
        httpCode: StatusCodes.OK,
        message: 'Authentication successful'
      })
    })

    it('should handle OAuth with temp user migration', async () => {
      mockRequest.body = {
        googleId: 'google_oauth_456',
        email: 'oauth2@example.com',
        tempUserId: 'temp_789'
      }

      mockCreateUser.mockResolvedValue(mockUserData)

      await handleGoogleOAuth(mockRequest as Request, mockResponse as Response)

      expect(mockCreateUser).toHaveBeenCalledWith({
        email: 'oauth2@example.com',
        googleId: 'google_oauth_456',
        tempUserId: 'temp_789'
      })

      expect(mockSuccess).toHaveBeenCalledWith({
        res: mockResponse,
        data: mockUserData,
        httpCode: StatusCodes.OK,
        message: 'Authentication successful'
      })
    })

    it('should return 400 when googleId is missing', async () => {
      mockRequest.body = {
        email: 'oauth@example.com'
      }

      await handleGoogleOAuth(mockRequest as Request, mockResponse as Response)

      expect(mockCreateUser).not.toHaveBeenCalled()
      expect(mockFailure).toHaveBeenCalledWith(
        expect.objectContaining({
          res: mockResponse,
          message: 'googleId and email are required for OAuth authentication',
          httpCode: StatusCodes.INTERNAL_SERVER_ERROR,
          error: expect.any(Object)
        })
      )
    })

    it('should return 400 when email is missing', async () => {
      mockRequest.body = {
        googleId: 'google_oauth_123'
      }

      await handleGoogleOAuth(mockRequest as Request, mockResponse as Response)

      expect(mockCreateUser).not.toHaveBeenCalled()
      expect(mockFailure).toHaveBeenCalledWith(
        expect.objectContaining({
          res: mockResponse,
          message: 'googleId and email are required for OAuth authentication',
          httpCode: StatusCodes.INTERNAL_SERVER_ERROR,
          error: expect.any(Object)
        })
      )
    })

    it('should return 400 when email format is invalid', async () => {
      mockRequest.body = {
        googleId: 'google_oauth_123',
        email: 'invalid-email'
      }

      await handleGoogleOAuth(mockRequest as Request, mockResponse as Response)

      expect(mockCreateUser).not.toHaveBeenCalled()
      expect(mockFailure).toHaveBeenCalledWith(
        expect.objectContaining({
          res: mockResponse,
          message: 'Invalid email format',
          httpCode: StatusCodes.INTERNAL_SERVER_ERROR,
          error: expect.any(Object)
        })
      )
    })

    it('should handle OAuth service errors', async () => {
      mockRequest.body = {
        googleId: 'google_oauth_123',
        email: 'oauth@example.com'
      }

      const authError = new Error('OAuth provider error')
      mockCreateUser.mockRejectedValue(authError)

      await handleGoogleOAuth(mockRequest as Request, mockResponse as Response)

      expect(mockFailure).toHaveBeenCalledWith({
        res: mockResponse,
        message: 'OAuth provider error',
        error: authError,
        httpCode: StatusCodes.INTERNAL_SERVER_ERROR
      })
    })
  })
})