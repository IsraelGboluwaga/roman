jest.mock('../resume.service', () => ({
  getActiveResume: jest.fn(),
  getResume: jest.fn().mockImplementation(() => Promise.resolve(null))
}))

jest.mock('../../data-extraction/resumeParser', () => ({
  ResumeParser: {
    parseFromBlob: jest.fn(),
    parseFromUrl: jest.fn()
  }
}))

jest.mock('../../storage/blobStorage.service', () => ({
  blobStorageService: {
    getCachedResumeData: jest.fn()
  }
}))

jest.mock('../../../config/winston', () => ({
  initLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  })
}))

import { getResumeContextForUser, getResumeContextByResumeId } from '../resumeContextService'
import { getActiveResume, getResume } from '../resume.service'
import { ResumeParser } from '../../data-extraction/resumeParser'
import { blobStorageService } from '../../storage/blobStorage.service'
import { initLogger } from '../../../config/winston'

const mockGetActiveResume = getActiveResume as jest.MockedFunction<typeof getActiveResume>
const mockGetResume = getResume as jest.MockedFunction<typeof getResume>
const mockResumeParser = ResumeParser as jest.Mocked<typeof ResumeParser>
const mockBlobStorageService = blobStorageService as jest.Mocked<typeof blobStorageService>
const mockInitLogger = initLogger as jest.MockedFunction<typeof initLogger>

const mockLogger = mockInitLogger('resumeContextService.ts')

describe('ResumeContextService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getResumeContextForUser', () => {
    const userId = 'user123'
    const mockResumeData = {
      id: 'resume456',
      userId: 'user123',
      active: true,
      fileUrl: 'https://example.com/resume.pdf',
      title: 'My Resume',
      blobId: 'blob789',
      created: new Date(),
      modified: new Date()
    }

    it('should return null when user has no active resume', async () => {
      mockGetActiveResume.mockResolvedValue(null)

      const result = await getResumeContextForUser(userId)

      expect(mockGetActiveResume).toHaveBeenCalledWith(userId)
      expect(result).toBeNull()
      expect(mockLogger.info).toHaveBeenCalledWith(`No active resume found for user ${userId}`)
    })

    it('should return cached data when available', async () => {
      const cachedData = {
        parsedText: 'Cached resume text',
        structuredData: { name: 'John Doe' },
        fileType: 'pdf' as const,
        extractedAt: new Date(),
        blobId: 'blob789'
      }

      mockGetActiveResume.mockResolvedValue(mockResumeData)
      mockBlobStorageService.getCachedResumeData.mockResolvedValue(cachedData)

      const result = await getResumeContextForUser(userId)

      expect(mockBlobStorageService.getCachedResumeData).toHaveBeenCalledWith(userId, mockResumeData.id)
      expect(result).toEqual({
        parsedText: cachedData.parsedText,
        structuredData: cachedData.structuredData,
        fileType: cachedData.fileType,
        blobId: cachedData.blobId
      })
      expect(mockLogger.info).toHaveBeenCalledWith(`Using cached resume context for user ${userId}`)
    })

    it('should parse from blob when blobId exists and no cache', async () => {
      const parseResult = {
        text: 'Parsed resume text',
        structuredData: { name: 'John Doe' },
        fileType: 'pdf' as const,
        blobId: 'blob789'
      }

      mockGetActiveResume.mockResolvedValue(mockResumeData)
      mockBlobStorageService.getCachedResumeData.mockResolvedValue(null)
      mockResumeParser.parseFromBlob.mockResolvedValue(parseResult)

      const result = await getResumeContextForUser(userId)

      expect(mockResumeParser.parseFromBlob).toHaveBeenCalledWith(mockResumeData.blobId, userId, mockResumeData.id)
      expect(result).toEqual({
        parsedText: parseResult.text,
        structuredData: parseResult.structuredData,
        fileType: parseResult.fileType,
        blobId: parseResult.blobId
      })
      expect(mockLogger.info).toHaveBeenCalledWith(`Parsing resume from blob ${mockResumeData.blobId} for user ${userId}`)
    })

    it('should fallback to URL parsing when no blobId exists', async () => {
      const resumeWithoutBlob = { ...mockResumeData, blobId: undefined }
      const parseResult = {
        text: 'Parsed resume text',
        structuredData: { name: 'John Doe' },
        fileType: 'pdf' as const,
        blobId: 'new-blob789'
      }

      mockGetActiveResume.mockResolvedValue(resumeWithoutBlob)
      mockBlobStorageService.getCachedResumeData.mockResolvedValue(null)
      mockResumeParser.parseFromUrl.mockResolvedValue(parseResult)

      const result = await getResumeContextForUser(userId)

      expect(mockResumeParser.parseFromUrl).toHaveBeenCalledWith(resumeWithoutBlob.fileUrl, userId, resumeWithoutBlob.id)
      expect(result).toEqual({
        parsedText: parseResult.text,
        structuredData: parseResult.structuredData,
        fileType: parseResult.fileType,
        blobId: parseResult.blobId
      })
      expect(mockLogger.info).toHaveBeenCalledWith(`Parsing resume from URL for user ${userId} (legacy fallback)`)
    })

    it('should return null when no valid source found', async () => {
      const resumeWithoutSource = { ...mockResumeData, blobId: undefined, fileUrl: '' }

      mockGetActiveResume.mockResolvedValue(resumeWithoutSource)
      mockBlobStorageService.getCachedResumeData.mockResolvedValue(null)

      const result = await getResumeContextForUser(userId)

      expect(result).toBeNull()
      expect(mockLogger.warn).toHaveBeenCalledWith(`No valid source found for resume context for user ${userId}`)
    })

    it('should handle errors and rethrow them', async () => {
      const error = new Error('Database error')
      mockGetActiveResume.mockRejectedValue(error)

      await expect(getResumeContextForUser(userId)).rejects.toThrow('Database error')
      expect(mockLogger.error).toHaveBeenCalledWith(`Error getting resume context for user ${userId}: ${error}`)
    })
  })

  describe('getResumeContextByResumeId', () => {
    const userId = 'user123'
    const resumeId = 'resume456'
    const mockResumeData = {
      id: resumeId,
      active: true,
      fileUrl: 'https://example.com/resume.pdf',
      title: 'My Resume',
      blobId: 'blob789',
      created: new Date(),
      modified: new Date()
    }

    it('should return cached data when available', async () => {
      const cachedData = {
        parsedText: 'Cached resume text',
        structuredData: { name: 'John Doe' },
        fileType: 'pdf' as const,
        extractedAt: new Date(),
        blobId: 'blob789'
      }

      mockBlobStorageService.getCachedResumeData.mockResolvedValue(cachedData)

      const result = await getResumeContextByResumeId(userId, resumeId)

      expect(mockBlobStorageService.getCachedResumeData).toHaveBeenCalledWith(userId, resumeId)
      expect(result).toEqual({
        parsedText: cachedData.parsedText,
        structuredData: cachedData.structuredData,
        fileType: cachedData.fileType,
        blobId: cachedData.blobId
      })
      expect(mockLogger.info).toHaveBeenCalledWith(`Using cached resume context for user ${userId}, resume ${resumeId}`)
    })

    it('should parse from blob when blobId exists and no cache', async () => {
      const parseResult = {
        text: 'Parsed resume text',
        structuredData: { name: 'John Doe' },
        fileType: 'pdf' as const,
        blobId: 'blob789'
      }

      mockBlobStorageService.getCachedResumeData.mockResolvedValue(null)
      mockGetResume.mockResolvedValue(mockResumeData)
      mockResumeParser.parseFromBlob.mockResolvedValue(parseResult)

      const result = await getResumeContextByResumeId(userId, resumeId)

      expect(mockGetResume).toHaveBeenCalledWith(resumeId)
      expect(mockResumeParser.parseFromBlob).toHaveBeenCalledWith(mockResumeData.blobId, userId, resumeId)
      expect(result).toEqual({
        parsedText: parseResult.text,
        structuredData: parseResult.structuredData,
        fileType: parseResult.fileType,
        blobId: parseResult.blobId
      })
      expect(mockLogger.info).toHaveBeenCalledWith(`Parsing resume from blob ${mockResumeData.blobId} for user ${userId}, resume ${resumeId}`)
    })

    it('should fallback to URL parsing when no blobId exists', async () => {
      const resumeWithoutBlob = { ...mockResumeData, blobId: undefined }
      const parseResult = {
        text: 'Parsed resume text',
        structuredData: { name: 'John Doe' },
        fileType: 'pdf' as const,
        blobId: 'new-blob789'
      }

      mockBlobStorageService.getCachedResumeData.mockResolvedValue(null)
      mockGetResume.mockResolvedValue(resumeWithoutBlob)
      mockResumeParser.parseFromUrl.mockResolvedValue(parseResult)

      const result = await getResumeContextByResumeId(userId, resumeId)

      expect(mockResumeParser.parseFromUrl).toHaveBeenCalledWith(resumeWithoutBlob.fileUrl, userId, resumeId)
      expect(result).toEqual({
        parsedText: parseResult.text,
        structuredData: parseResult.structuredData,
        fileType: parseResult.fileType,
        blobId: parseResult.blobId
      })
      expect(mockLogger.info).toHaveBeenCalledWith(`Parsing resume from URL for user ${userId}, resume ${resumeId} (legacy fallback)`)
    })

    it('should return null when resume not found', async () => {
      mockBlobStorageService.getCachedResumeData.mockResolvedValue(null)
      mockGetResume.mockResolvedValue(null as any)

      const result = await getResumeContextByResumeId(userId, resumeId)

      expect(result).toBeNull()
      expect(mockLogger.warn).toHaveBeenCalledWith(`Resume ${resumeId} not found or does not belong to user ${userId}`)
    })

    it('should return null when resume ID mismatch', async () => {
      const resumeWithDifferentId = { ...mockResumeData, id: 'different-id' }

      mockBlobStorageService.getCachedResumeData.mockResolvedValue(null)
      mockGetResume.mockResolvedValue(resumeWithDifferentId)

      const result = await getResumeContextByResumeId(userId, resumeId)

      expect(result).toBeNull()
      expect(mockLogger.warn).toHaveBeenCalledWith(`Resume ${resumeId} not found or does not belong to user ${userId}`)
    })

    it('should return null when no valid source found', async () => {
      const resumeWithoutSource = { ...mockResumeData, blobId: undefined, fileUrl: '' }

      mockBlobStorageService.getCachedResumeData.mockResolvedValue(null)
      mockGetResume.mockResolvedValue(resumeWithoutSource)

      const result = await getResumeContextByResumeId(userId, resumeId)

      expect(result).toBeNull()
      expect(mockLogger.warn).toHaveBeenCalledWith(`No valid source found for resume context for user ${userId}, resume ${resumeId}`)
    })

    it('should handle errors and rethrow them', async () => {
      const error = new Error('Database error')
      mockBlobStorageService.getCachedResumeData.mockRejectedValue(error)

      await expect(getResumeContextByResumeId(userId, resumeId)).rejects.toThrow('Database error')
      expect(mockLogger.error).toHaveBeenCalledWith(`Error getting resume context for user ${userId}, resume ${resumeId}: ${error}`)
    })
  })
})