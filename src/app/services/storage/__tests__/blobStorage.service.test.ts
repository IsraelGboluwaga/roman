import { ObjectId } from 'mongodb'

jest.mock('../../../config/gridfs', () => ({
  getGridFSBucket: jest.fn()
}))

jest.mock('../../../config/constants', () => ({
  RESUME_CACHE_TTL_HOURS: 72
}))

jest.mock('../../../config/redis', () => ({
  RedisHelper: {
    getAsync: jest.fn(),
    getClient: jest.fn()
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

import { BlobStorageService } from '../blobStorage.service'
import { RESUME_CACHE_TTL_HOURS } from '../../../config/constants'

describe('BlobStorageService', () => {
  let service: BlobStorageService
  let mockBucket: any
  let mockRedisClient: any

  beforeEach(() => {
    jest.clearAllMocks()

    mockBucket = {
      openUploadStream: jest.fn(),
      openDownloadStream: jest.fn(),
      delete: jest.fn(),
      find: jest.fn()
    }

    mockRedisClient = {
      setex: jest.fn(),
      del: jest.fn()
    }

    const { getGridFSBucket } = require('../../../config/gridfs')
    const { RedisHelper } = require('../../../config/redis')
    
    getGridFSBucket.mockReturnValue(mockBucket)
    RedisHelper.getClient.mockReturnValue(mockRedisClient)
    RedisHelper.getAsync.mockResolvedValue(null)

    service = new BlobStorageService()
  })

  describe('deleteBlob', () => {
    it('should delete blob successfully', async () => {
      const blobId = new ObjectId().toString()
      mockBucket.delete.mockResolvedValue(undefined)

      await service.deleteBlob(blobId)

      expect(mockBucket.delete).toHaveBeenCalledWith(new ObjectId(blobId))
    })

    it('should handle delete errors', async () => {
      const blobId = new ObjectId().toString()
      mockBucket.delete.mockRejectedValue(new Error('Delete failed'))

      await expect(service.deleteBlob(blobId)).rejects.toThrow('Delete failed')
    })
  })

  describe('getBlobInfo', () => {
    it('should return blob info when found', async () => {
      const blobId = new ObjectId().toString()
      const mockFile = {
        _id: new ObjectId(blobId),
        filename: 'test.pdf',
        contentType: 'application/pdf',
        length: 1024,
        uploadDate: new Date(),
        metadata: { userId: 'user123' }
      }

      mockBucket.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([mockFile])
      })

      const result = await service.getBlobInfo(blobId)

      expect(result).toEqual({
        id: blobId,
        filename: mockFile.filename,
        contentType: mockFile.contentType,
        size: mockFile.length,
        uploadDate: mockFile.uploadDate,
        metadata: mockFile.metadata
      })
    })

    it('should return null when blob not found', async () => {
      const blobId = new ObjectId().toString()

      mockBucket.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([])
      })

      const result = await service.getBlobInfo(blobId)

      expect(result).toBeNull()
    })
  })

  describe('Redis cache methods', () => {
    const userId = 'user123'
    const resumeId = 'resume456'
    const cacheData = {
      parsedText: 'test resume text',
      structuredData: { name: 'John Doe' },
      fileType: 'pdf' as const,
      extractedAt: new Date(),
      blobId: 'blob789'
    }

    describe('cacheResumeData', () => {
      it('should cache resume data with TTL', async () => {
        mockRedisClient.setex.mockResolvedValue('OK')

        await service.cacheResumeData(userId, resumeId, cacheData)

        const expectedKey = `resume:parsed:${userId}:${resumeId}`
        const expectedTTL = RESUME_CACHE_TTL_HOURS * 60 * 60
        const expectedValue = JSON.stringify(cacheData)

        expect(mockRedisClient.setex).toHaveBeenCalledWith(expectedKey, expectedTTL, expectedValue)
      })

      it('should handle cache errors gracefully', async () => {
        mockRedisClient.setex.mockRejectedValue(new Error('Redis error'))

        await expect(service.cacheResumeData(userId, resumeId, cacheData)).resolves.toBeUndefined()
      })
    })

    describe('getCachedResumeData', () => {
      it('should return cached data when available', async () => {
        const { RedisHelper } = require('../../../config/redis')
        const serializedCacheData = JSON.stringify({
          ...cacheData,
          extractedAt: cacheData.extractedAt.toISOString()
        })
        RedisHelper.getAsync.mockResolvedValue(serializedCacheData)

        const result = await service.getCachedResumeData(userId, resumeId)

        expect(result).toEqual({
          ...cacheData,
          extractedAt: cacheData.extractedAt.toISOString()
        })
        expect(RedisHelper.getAsync).toHaveBeenCalledWith(`resume:parsed:${userId}:${resumeId}`)
      })

      it('should return null when cache miss', async () => {
        const { RedisHelper } = require('../../../config/redis')
        RedisHelper.getAsync.mockResolvedValue(null)

        const result = await service.getCachedResumeData(userId, resumeId)

        expect(result).toBeNull()
      })

      it('should handle cache errors gracefully', async () => {
        const { RedisHelper } = require('../../../config/redis')
        RedisHelper.getAsync.mockRejectedValue(new Error('Redis error'))

        const result = await service.getCachedResumeData(userId, resumeId)

        expect(result).toBeNull()
      })
    })

    describe('invalidateResumeCache', () => {
      it('should delete cache key', async () => {
        mockRedisClient.del.mockResolvedValue(1)

        await service.invalidateResumeCache(userId, resumeId)

        expect(mockRedisClient.del).toHaveBeenCalledWith(`resume:parsed:${userId}:${resumeId}`)
      })

      it('should handle deletion errors gracefully', async () => {
        mockRedisClient.del.mockRejectedValue(new Error('Redis error'))

        await expect(service.invalidateResumeCache(userId, resumeId)).resolves.toBeUndefined()
      })
    })
  })
})