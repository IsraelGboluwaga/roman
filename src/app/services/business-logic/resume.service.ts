import { Resume, IResume, User, TempUser, GeneratedResume } from '../../models'
import { initLogger } from '../../config/winston'
import { RESUME_LIMIT_PER_USER } from '../../config/constants'
import { ResumeParser } from '../data-extraction/resumeParser'
import { blobStorageService } from '../storage/blobStorage.service'
import mongoose from 'mongoose'

const logger = initLogger('resume.service.ts')

export interface AddResumeInput {
  userId: string
  fileUrl: string
  title?: string
  setAsActive?: boolean
}

export const addResume = async (data: AddResumeInput): Promise<string> => {
  const session = await mongoose.startSession()
  
  try {
    return await session.withTransaction(async () => {
      logger.info('Adding new resume to database...')
      
      // Check resume limit per user
      const existingResumeCount = await Resume.countDocuments({ userId: data.userId }).session(session)
      if (existingResumeCount >= RESUME_LIMIT_PER_USER) {
        throw new Error(`Resume limit reached. You can have a maximum of ${RESUME_LIMIT_PER_USER} resumes. Please delete an existing resume before adding a new one.`)
      }
      
      // If setAsActive is true, deactivate all existing resumes
      if (data.setAsActive) {
        await Resume.updateMany(
          { userId: data.userId },
          { active: false },
          { session }
        )
      }
      
      // Parse and store resume data
      logger.info('Parsing resume and storing blob...')
      const parseResult = await ResumeParser.parseFromUrl(data.fileUrl, data.userId)
      
      const resume = new Resume({
        userId: data.userId,
        fileUrl: data.fileUrl,
        title: data.title,
        active: data.setAsActive || existingResumeCount === 0, // First resume is always active
        blobId: parseResult.blobId,
        parsedText: parseResult.text,
        structuredData: parseResult.structuredData
      })

      const savedResume: IResume = await resume.save({ session })
      logger.info(`Resume added successfully with ID: ${savedResume._id}`)
      
      // Cache the parsed data now that we have the resumeId
      if (parseResult.blobId) {
        await blobStorageService.cacheResumeData(data.userId, savedResume._id.toString(), {
          parsedText: parseResult.text,
          structuredData: parseResult.structuredData,
          fileType: parseResult.fileType,
          extractedAt: new Date(),
          blobId: parseResult.blobId
        })
      }
      
      return savedResume._id.toString()
    })
  } catch (error) {
    logger.error(`Error adding resume: ${error}`)
    throw error
  } finally {
    await session.endSession()
  }
}

export interface GetResumeResult {
  id: string
  userId: string
  active: boolean
  fileUrl: string
  title?: string
  blobId?: string
  parsedText?: string
  structuredData?: {
    name?: string
    email?: string
    phone?: string
    skills?: string[]
    experience?: string[]
    education?: string[]
    [key: string]: any
  }
  created: Date
  modified: Date
}

export const getResume = async (id: string): Promise<GetResumeResult> => {
  try {
    logger.info(`Fetching resume with ID: ${id}`)
    
    const resume: IResume | null = await Resume.findById(id)
    
    if (!resume) {
      throw new Error('Resume not found')
    }

    logger.info(`Resume fetched successfully with ID: ${resume._id}`)
    
    return {
      id: resume._id.toString(),
      userId: resume.userId,
      active: resume.active,
      fileUrl: resume.fileUrl,
      title: resume.title,
      blobId: resume.blobId,
      parsedText: resume.parsedText,
      structuredData: resume.structuredData,
      created: resume.created,
      modified: resume.modified
    }
  } catch (error) {
    logger.error(`Error fetching resume: ${error}`)
    throw error
  }
}

export const getActiveResume = async (userId: string): Promise<GetResumeResult | null> => {
  try {
    logger.info(`Fetching active resume for user: ${userId}`)
    
    const resume: IResume | null = await Resume.findOne({ userId, active: true })
    
    if (!resume) {
      logger.info('No active resume found for user')
      return null
    }

    logger.info(`Active resume fetched successfully with ID: ${resume._id}`)
    
    return {
      id: resume._id.toString(),
      userId: resume.userId,
      active: resume.active,
      fileUrl: resume.fileUrl,
      title: resume.title,
      blobId: resume.blobId,
      parsedText: resume.parsedText,
      structuredData: resume.structuredData,
      created: resume.created,
      modified: resume.modified
    }
  } catch (error) {
    logger.error(`Error fetching active resume: ${error}`)
    throw error
  }
}

export const getAllResumes = async (userId: string): Promise<GetResumeResult[]> => {
  try {
    logger.info(`Fetching all resumes for user: ${userId}`)
    
    const resumes: IResume[] = await Resume.find({ userId }).sort({ createdAt: -1 })
    
    logger.info(`Found ${resumes.length} resumes for user`)
    
    return resumes.map(resume => ({
      id: resume._id.toString(),
      userId: resume.userId,
      active: resume.active,
      fileUrl: resume.fileUrl,
      title: resume.title,
      blobId: resume.blobId,
      parsedText: resume.parsedText,
      structuredData: resume.structuredData,
      created: resume.created,
      modified: resume.modified
    }))
  } catch (error) {
    logger.error(`Error fetching resumes: ${error}`)
    throw error
  }
}

export const setActiveResume = async (userId: string, resumeId: string): Promise<void> => {
  const session = await mongoose.startSession()
  
  try {
    await session.withTransaction(async () => {
      logger.info(`Setting resume ${resumeId} as active for user ${userId}`)
      
      // Verify resume belongs to user
      const resume = await Resume.findOne({ _id: resumeId, userId }).session(session)
      if (!resume) {
        throw new Error('Resume not found or does not belong to user')
      }
      
      // Set all user's resumes to inactive
      await Resume.updateMany(
        { userId },
        { active: false },
        { session }
      )
      
      // Set target resume to active
      await Resume.updateOne(
        { _id: resumeId, userId },
        { active: true },
        { session }
      )
      
      logger.info(`Resume ${resumeId} set as active successfully`)
    })
  } catch (error) {
    logger.error(`Error setting active resume: ${error}`)
    throw error
  } finally {
    await session.endSession()
  }
}

export const deleteResume = async (userId: string, resumeId: string): Promise<void> => {
  const session = await mongoose.startSession()
  
  try {
    await session.withTransaction(async () => {
      logger.info(`Deleting resume ${resumeId} for user ${userId}`)
      
      // Verify resume belongs to user
      const resume = await Resume.findOne({ _id: resumeId, userId }).session(session)
      if (!resume) {
        logger.info(`Resume ${resumeId} not found. Skipping delete.`)
        return
      }
      
      // Delete associated blob if exists
      if (resume.blobId) {
        try {
          await blobStorageService.deleteBlob(resume.blobId)
          await blobStorageService.invalidateResumeCache(userId, resumeId)
          logger.info(`Deleted associated blob and cache for resume ${resumeId}`)
        } catch (blobError) {
          logger.warn(`Failed to delete blob ${resume.blobId}: ${blobError}`)
        }
      }
      
      // Delete the resume
      await Resume.deleteOne({ _id: resumeId, userId }, { session })
      
      // If deleted resume was active, make the most recent resume active
      if (resume.active) {
        const mostRecentResume = await Resume.findOne({ userId })
          .sort({ createdAt: -1 })
          .session(session)
          
        if (mostRecentResume) {
          await Resume.updateOne(
            { _id: mostRecentResume._id },
            { active: true },
            { session }
          )
          logger.info(`Set resume ${mostRecentResume._id} as active after deletion`)
        }
      }
      
      logger.info(`Resume ${resumeId} deleted successfully`)
    })
  } catch (error) {
    logger.error(`Error deleting resume: ${error}`)
    throw error
  } finally {
    await session.endSession()
  }
}

export interface GenerateResumeInput {
  jobDescription: string
  userId?: string // Optional for anonymous users
}

export const generateResume = async (data: GenerateResumeInput): Promise<any> => {
  try {
    logger.info('Generating resume based on job description...')
    
    // Generate temporary userId if none provided (anonymous user)
    let userId = data.userId
    if (!userId) {
      userId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Create temp user record
      const tempUser = new TempUser({
        tempUserId: userId
      })
      await tempUser.save()
      logger.info(`Created temporary user: ${userId}`)
    }
    
    // TODO: Implement AI generation logic
    // 1. Extract text from user's existing resume (if userId provided and not temp)
    // 2. Use AI service to tailor resume content to job description
    // 3. Generate and store resume file
    
    // Placeholder URL - replace with actual generated resume URL
    const generatedResumeUrl = `https://example.com/generated-resume-${Date.now()}.pdf`
    
    // Find user's active resume if they have one
    let sourceResumeId = null
    if (userId) {
      const activeResume = await getActiveResume(userId)
      sourceResumeId = activeResume ? activeResume.id : null
    }
    
    // Save generated resume to collection
    const generatedResume = new GeneratedResume({
      userId,
      type: userId.startsWith('temp_') ? 'temporary' : 'permanent',
      url: generatedResumeUrl,
      jobDescription: data.jobDescription,
      generatedFrom: sourceResumeId
    })
    
    await generatedResume.save()
    logger.info(`Generated resume saved with ID: ${generatedResume._id}`)
    
    return {
      id: generatedResume._id,
      userId,
      url: generatedResumeUrl,
      type: generatedResume.type
    }
  } catch (error) {
    logger.error(`Error generating resume: ${error}`)
    throw error
  }
}

export interface MigrateTempUserInput {
  email: string
  tempUserId: string
  googleId?: string
}

export const migrateTempUserToReal = async (data: MigrateTempUserInput): Promise<string> => {
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
      const newUser = await User.create([{
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
          type: 'permanent' // Upgrade from temporary to permanent
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
