import { User, TempUser, Resume, GeneratedResume } from '../../models'
import { initLogger } from '../../config/winston'
import mongoose from 'mongoose'

const logger = initLogger('user.service.ts')

export interface CreateUserInput {
  email: string
  googleId?: string
  tempUserId?: string
}

export interface GetUserInput {
  userId: string
}

export interface UserResult {
  id: string
  email: string
  userId: string
  googleId?: string
  createdAt: Date
  updatedAt: Date
}

export const createUser = async (data: CreateUserInput): Promise<UserResult> => {
  try {
    logger.info('Creating new user...')
    
    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: data.email },
        ...(data.googleId ? [{ googleId: data.googleId }] : [])
      ]
    })
    
    if (existingUser) {
      logger.info(`User already exists with email: ${data.email}`)
      return {
        id: existingUser._id.toString(),
        email: existingUser.email,
        userId: existingUser.userId,
        googleId: existingUser.googleId,
        createdAt: existingUser.createdAt,
        updatedAt: existingUser.updatedAt
      }
    }

    // If tempUserId provided, migrate from temporary user
    if (data.tempUserId) {
      logger.info(`Migrating temporary user ${data.tempUserId} to real user`)
      const realUserId = await migrateTempUserToReal({
        email: data.email,
        tempUserId: data.tempUserId,
        googleId: data.googleId
      })
      
      const migratedUser = await User.findOne({ userId: realUserId })
      if (!migratedUser) {
        throw new Error('Failed to retrieve migrated user')
      }
      
      return {
        id: migratedUser._id.toString(),
        email: migratedUser.email,
        userId: migratedUser.userId,
        googleId: migratedUser.googleId,
        createdAt: migratedUser.createdAt,
        updatedAt: migratedUser.updatedAt
      }
    }

    // Create new user
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const newUser = new User({
      email: data.email,
      userId,
      googleId: data.googleId
    })

    const savedUser = await newUser.save()
    logger.info(`User created successfully with ID: ${savedUser._id}`)
    
    return {
      id: savedUser._id.toString(),
      email: savedUser.email,
      userId: savedUser.userId,
      googleId: savedUser.googleId,
      createdAt: savedUser.createdAt,
      updatedAt: savedUser.updatedAt
    }
  } catch (error) {
    logger.error(`Error creating user: ${error}`)
    throw error
  }
}

export const getUser = async (data: GetUserInput): Promise<UserResult | null> => {
  try {
    logger.info('Fetching user...')
    
    if (!data.userId) {
      throw new Error('userId is required')
    }

    const user = await User.findOne({ userId: data.userId })
    
    if (!user) {
      logger.info('User not found')
      return null
    }

    logger.info(`User fetched successfully with ID: ${user._id}`)
    
    return {
      id: user._id.toString(),
      email: user.email,
      userId: user.userId,
      googleId: user.googleId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  } catch (error) {
    logger.error(`Error fetching user: ${error}`)
    throw error
  }
}

export const getUserByEmail = async (email: string): Promise<UserResult | null> => {
  try {
    logger.info('Fetching user by email...')
    
    if (!email) {
      throw new Error('email is required')
    }

    const user = await User.findOne({ email })
    
    if (!user) {
      logger.info('User not found')
      return null
    }

    logger.info(`User fetched successfully with ID: ${user._id}`)
    
    return {
      id: user._id.toString(),
      email: user.email,
      userId: user.userId,
      googleId: user.googleId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  } catch (error) {
    logger.error(`Error fetching user by email: ${error}`)
    throw error
  }
}

interface MigrateTempUserInput {
  email: string
  tempUserId: string
  googleId?: string
}

const migrateTempUserToReal = async (data: MigrateTempUserInput): Promise<string> => {
  const session = await mongoose.startSession()
  
  try {
    return await session.withTransaction(async () => {
      logger.info(`Starting migration from temp user ${data.tempUserId} to real user`)
      
      // 1. Find temp user data
      const tempUser = await TempUser.findOne({ tempUserId: data.tempUserId }).session(session)
      if (!tempUser) {
        throw new Error(`Temporary user ${data.tempUserId} not found`)
      }
      
      // 2. Create real user
      const realUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      await User.create([{
        email: data.email,
        userId: realUserId,
        googleId: data.googleId,
        migratedFromTempId: data.tempUserId
      }], { session })
      
      // 3. Update all resumes to use real userId
      const resumeUpdateResult = await Resume.updateMany(
        { userId: data.tempUserId },
        { userId: realUserId },
        { session }
      )
      logger.info(`Updated ${resumeUpdateResult.modifiedCount} resumes`)
      
      // 4. Update all generated resumes to real userId and mark as permanent
      const generatedResumeUpdateResult = await GeneratedResume.updateMany(
        { userId: data.tempUserId },
        { 
          userId: realUserId,
          type: 'permanent'
        },
        { session }
      )
      logger.info(`Updated ${generatedResumeUpdateResult.modifiedCount} generated resumes`)
      
      // 5. Delete temp user (cleanup)
      await TempUser.deleteOne({ tempUserId: data.tempUserId }, { session })
      logger.info(`Deleted temporary user ${data.tempUserId}`)
      
      logger.info(`Migration completed successfully. New user ID: ${realUserId}`)
      return realUserId
    })
  } catch (error) {
    logger.error(`Error migrating temp user: ${error}`)
    throw error
  } finally {
    await session.endSession()
  }
}
