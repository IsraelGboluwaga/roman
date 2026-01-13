import { getActiveResume } from './resume.service'
import { ResumeParser } from '../data-extraction/resumeParser'
import { blobStorageService } from '../storage/blobStorage.service'
import { initLogger } from '../../config/winston'

const logger = initLogger('resumeContextService.ts')

export interface ResumeContextData {
  parsedText: string
  structuredData: any
  fileType: 'pdf' | 'docx' | 'doc' | 'image'
  blobId: string
}

export const getResumeContextForUser = async (userId: string): Promise<ResumeContextData | null> => {
  try {
    logger.info(`Getting resume context for user: ${userId}`)
    
    // Get user's active resume
    const activeResume = await getActiveResume(userId)
    if (!activeResume) {
      logger.info(`No active resume found for user ${userId}`)
      return null
    }
    
    // Check cache first
    const cachedData = await blobStorageService.getCachedResumeData(userId, activeResume.id)
    if (cachedData) {
      logger.info(`Using cached resume context for user ${userId}`)
      return {
        parsedText: cachedData.parsedText,
        structuredData: cachedData.structuredData,
        fileType: cachedData.fileType,
        blobId: cachedData.blobId
      }
    }
    
    // If blobId exists, parse from blob
    if (activeResume.blobId) {
      logger.info(`Parsing resume from blob ${activeResume.blobId} for user ${userId}`)
      const parseResult = await ResumeParser.parseFromBlob(activeResume.blobId, userId, activeResume.id)
      return {
        parsedText: parseResult.text,
        structuredData: parseResult.structuredData,
        fileType: parseResult.fileType,
        blobId: parseResult.blobId!
      }
    }
    
    // Fallback to URL parsing if no blob exists (legacy resumes)
    if (activeResume.fileUrl) {
      logger.info(`Parsing resume from URL for user ${userId} (legacy fallback)`)
      const parseResult = await ResumeParser.parseFromUrl(activeResume.fileUrl, userId, activeResume.id)
      return {
        parsedText: parseResult.text,
        structuredData: parseResult.structuredData,
        fileType: parseResult.fileType,
        blobId: parseResult.blobId!
      }
    }
    
    logger.warn(`No valid source found for resume context for user ${userId}`)
    return null
  } catch (error) {
    logger.error(`Error getting resume context for user ${userId}: ${error}`)
    throw error
  }
}

export const getResumeContextByResumeId = async (userId: string, resumeId: string): Promise<ResumeContextData | null> => {
  try {
    logger.info(`Getting resume context for user: ${userId}, resume: ${resumeId}`)
    
    // Check cache first
    const cachedData = await blobStorageService.getCachedResumeData(userId, resumeId)
    if (cachedData) {
      logger.info(`Using cached resume context for user ${userId}, resume ${resumeId}`)
      return {
        parsedText: cachedData.parsedText,
        structuredData: cachedData.structuredData,
        fileType: cachedData.fileType,
        blobId: cachedData.blobId
      }
    }
    
    // Get resume by ID
    const { getResume } = await import('./resume.service')
    const resume = await getResume(resumeId)
    
    // Verify resume belongs to user
    if (!resume || resume.id !== resumeId) {
      logger.warn(`Resume ${resumeId} not found or does not belong to user ${userId}`)
      return null
    }
    
    // If blobId exists, parse from blob
    if (resume.blobId) {
      logger.info(`Parsing resume from blob ${resume.blobId} for user ${userId}, resume ${resumeId}`)
      const parseResult = await ResumeParser.parseFromBlob(resume.blobId, userId, resumeId)
      return {
        parsedText: parseResult.text,
        structuredData: parseResult.structuredData,
        fileType: parseResult.fileType,
        blobId: parseResult.blobId!
      }
    }
    
    // Fallback to URL parsing if no blob exists (legacy resumes)
    if (resume.fileUrl) {
      logger.info(`Parsing resume from URL for user ${userId}, resume ${resumeId} (legacy fallback)`)
      const parseResult = await ResumeParser.parseFromUrl(resume.fileUrl, userId, resumeId)
      return {
        parsedText: parseResult.text,
        structuredData: parseResult.structuredData,
        fileType: parseResult.fileType,
        blobId: parseResult.blobId!
      }
    }
    
    logger.warn(`No valid source found for resume context for user ${userId}, resume ${resumeId}`)
    return null
  } catch (error) {
    logger.error(`Error getting resume context for user ${userId}, resume ${resumeId}: ${error}`)
    throw error
  }
}