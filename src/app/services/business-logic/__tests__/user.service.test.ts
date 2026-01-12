jest.mock('../../../models', () => ({
  User: jest.fn().mockImplementation(() => ({
    save: jest.fn().mockResolvedValue({
      _id: { toString: () => 'mock-object-id' },
      email: 'test@example.com',
      userId: 'user_123_abc',
      googleId: 'google_123',
      createdAt: new Date(),
      updatedAt: new Date()
    })
  })),
  TempUser: {
    findOne: jest.fn(),
    deleteOne: jest.fn()
  },
  Resume: {
    updateMany: jest.fn()
  },
  GeneratedResume: {
    updateMany: jest.fn()
  }
}))

// Add static methods to the User mock
const UserMock = require('../../../models').User as jest.MockedFunction<any>
UserMock.findOne = jest.fn()

jest.mock('../../../config/winston', () => ({
  initLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  })
}))

jest.mock('mongoose', () => ({
  startSession: jest.fn()
}))

import { createUser, getUser } from '../user.service'
import { User, TempUser } from '../../../models'
import mongoose from 'mongoose'

const mockUser = UserMock
const mockTempUser = TempUser as jest.Mocked<typeof TempUser>

describe('User Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createUser', () => {
    const mockUserData = {
      _id: { toString: () => 'mock-object-id' },
      email: 'test@example.com',
      userId: 'user_123_abc',
      googleId: 'google_123',
      createdAt: new Date(),
      updatedAt: new Date(),
      save: jest.fn()
    }

    it('should return existing user if user already exists by email', async () => {
      mockUser.findOne.mockResolvedValue(mockUserData)

      const result = await createUser({
        email: 'test@example.com',
        googleId: 'google_123'
      })

      expect(mockUser.findOne).toHaveBeenCalledWith({
        $or: [
          { email: 'test@example.com' },
          { googleId: 'google_123' }
        ]
      })

      expect(result).toEqual({
        id: mockUserData._id.toString(),
        email: mockUserData.email,
        userId: mockUserData.userId,
        googleId: mockUserData.googleId,
        createdAt: mockUserData.createdAt,
        updatedAt: mockUserData.updatedAt
      })
    })

    it('should create new user when user does not exist', async () => {
      mockUser.findOne.mockResolvedValue(null)
      
      const mockNewUser = {
        ...mockUserData,
        save: jest.fn().mockResolvedValue(mockUserData)
      }
      
      // Mock User constructor
      ;(User as any).mockImplementation(() => mockNewUser)

      const result = await createUser({
        email: 'new@example.com',
        googleId: 'google_456'
      })

      expect(mockUser.findOne).toHaveBeenCalledWith({
        $or: [
          { email: 'new@example.com' },
          { googleId: 'google_456' }
        ]
      })

      expect(mockNewUser.save).toHaveBeenCalled()
      expect(result).toEqual({
        id: mockUserData._id.toString(),
        email: mockUserData.email,
        userId: mockUserData.userId,
        googleId: mockUserData.googleId,
        createdAt: mockUserData.createdAt,
        updatedAt: mockUserData.updatedAt
      })
    })

    it('should handle errors during user creation', async () => {
      const error = new Error('Database error')
      mockUser.findOne.mockRejectedValue(error)

      await expect(createUser({
        email: 'error@example.com'
      })).rejects.toThrow('Database error')
    })
  })

  describe('getUser', () => {
    const mockUserData = {
      _id: { toString: () => 'mock-object-id' },
      email: 'test@example.com',
      userId: 'user_123_abc',
      googleId: 'google_123',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    it('should return user when found', async () => {
      mockUser.findOne.mockResolvedValue(mockUserData)

      const result = await getUser({ userId: 'user_123_abc' })

      expect(mockUser.findOne).toHaveBeenCalledWith({ userId: 'user_123_abc' })
      expect(result).toEqual({
        id: mockUserData._id.toString(),
        email: mockUserData.email,
        userId: mockUserData.userId,
        googleId: mockUserData.googleId,
        createdAt: mockUserData.createdAt,
        updatedAt: mockUserData.updatedAt
      })
    })

    it('should return null when user not found', async () => {
      mockUser.findOne.mockResolvedValue(null)

      const result = await getUser({ userId: 'nonexistent_user' })

      expect(mockUser.findOne).toHaveBeenCalledWith({ userId: 'nonexistent_user' })
      expect(result).toBeNull()
    })

    it('should throw error when userId is not provided', async () => {
      await expect(getUser({ userId: '' })).rejects.toThrow('userId is required')
    })

    it('should handle database errors', async () => {
      const error = new Error('Database connection failed')
      mockUser.findOne.mockRejectedValue(error)

      await expect(getUser({ userId: 'user_123' })).rejects.toThrow('Database connection failed')
    })
  })
})