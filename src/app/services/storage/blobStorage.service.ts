import { GridFSBucket, ObjectId } from 'mongodb'
import { Readable } from 'stream'
import { getGridFSBucket } from '../../config/gridfs'
import { RedisHelper } from '../../config/redis'
import { RESUME_CACHE_TTL_HOURS } from '../../config/constants'
import { initLogger } from '../../config/winston'

const logger = initLogger('blobStorage.service.ts')

export interface StoredBlob {
  id: string
  filename: string
  contentType: string
  size: number
  uploadDate: Date
  metadata?: any
}

export interface CachedResumeData {
  parsedText: string
  structuredData: any
  fileType: 'pdf' | 'docx' | 'doc' | 'image'
  extractedAt: Date
  blobId: string
}

export class BlobStorageService {
  private bucket: GridFSBucket | null = null

  private getBucket(): GridFSBucket {
    if (!this.bucket) {
      this.bucket = getGridFSBucket()
    }
    return this.bucket
  }

  async storeBlob(
    buffer: Buffer,
    filename: string,
    contentType: string,
    metadata: any = {}
  ): Promise<StoredBlob> {
    try {
      logger.info(`Storing blob: ${filename} (${buffer.length} bytes)`)

      const uploadStream = this.getBucket().openUploadStream(filename, {
        contentType,
        metadata: {
          ...metadata,
          originalSize: buffer.length,
          uploadedAt: new Date()
        }
      })

      const readable = new Readable({
        read() {}
      })
      readable.push(buffer)
      readable.push(null)

      return new Promise((resolve, reject) => {
        uploadStream.on('finish', () => {
          logger.info(`Blob stored successfully with ID: ${uploadStream.id}`)
          resolve({
            id: uploadStream.id.toString(),
            filename: uploadStream.filename,
            contentType: contentType,
            size: buffer.length,
            uploadDate: new Date(),
            metadata
          })
        })

        uploadStream.on('error', (error) => {
          logger.error(`Failed to store blob: ${error}`)
          reject(error)
        })

        readable.pipe(uploadStream)
      })
    } catch (error) {
      logger.error(`Error storing blob: ${error}`)
      throw error
    }
  }

  async getBlob(blobId: string): Promise<Buffer> {
    try {
      logger.info(`Retrieving blob with ID: ${blobId}`)

      const downloadStream = this.getBucket().openDownloadStream(new ObjectId(blobId))
      const chunks: Buffer[] = []

      return new Promise((resolve, reject) => {
        downloadStream.on('data', (chunk) => {
          chunks.push(chunk)
        })

        downloadStream.on('end', () => {
          const buffer = Buffer.concat(chunks)
          logger.info(`Blob retrieved successfully (${buffer.length} bytes)`)
          resolve(buffer)
        })

        downloadStream.on('error', (error) => {
          logger.error(`Failed to retrieve blob: ${error}`)
          reject(error)
        })
      })
    } catch (error) {
      logger.error(`Error retrieving blob: ${error}`)
      throw error
    }
  }

  async deleteBlob(blobId: string): Promise<void> {
    try {
      logger.info(`Deleting blob with ID: ${blobId}`)
      await this.getBucket().delete(new ObjectId(blobId))
      logger.info(`Blob deleted successfully`)
    } catch (error) {
      logger.error(`Error deleting blob: ${error}`)
      throw error
    }
  }

  async getBlobInfo(blobId: string): Promise<StoredBlob | null> {
    try {
      const files = await this.getBucket().find({ _id: new ObjectId(blobId) }).toArray()
      if (files.length === 0) {
        return null
      }

      const file = files[0]
      return {
        id: file._id.toString(),
        filename: file.filename,
        contentType: file.contentType || 'application/octet-stream',
        size: file.length,
        uploadDate: file.uploadDate,
        metadata: file.metadata
      }
    } catch (error) {
      logger.error(`Error getting blob info: ${error}`)
      throw error
    }
  }

  // Redis cache methods for parsed resume data
  async cacheResumeData(userId: string, resumeId: string, data: CachedResumeData): Promise<void> {
    try {
      const cacheKey = `resume:parsed:${userId}:${resumeId}`
      const cacheValue = JSON.stringify(data)
      
      // Cache for configured TTL hours
      await RedisHelper.getClient().setex(cacheKey, RESUME_CACHE_TTL_HOURS * 60 * 60, cacheValue)
      logger.info(`Cached resume data for user ${userId}, resume ${resumeId}`)
    } catch (error) {
      logger.error(`Failed to cache resume data: ${error}`)
      // Don't throw - caching failure shouldn't break the flow
    }
  }

  async getCachedResumeData(userId: string, resumeId: string): Promise<CachedResumeData | null> {
    try {
      const cacheKey = `resume:parsed:${userId}:${resumeId}`
      const cachedData = await RedisHelper.getAsync(cacheKey)
      
      if (cachedData) {
        logger.info(`Cache hit for user ${userId}, resume ${resumeId}`)
        return JSON.parse(cachedData)
      }
      
      logger.info(`Cache miss for user ${userId}, resume ${resumeId}`)
      return null
    } catch (error) {
      logger.error(`Failed to retrieve cached resume data: ${error}`)
      return null
    }
  }

  async invalidateResumeCache(userId: string, resumeId: string): Promise<void> {
    try {
      const cacheKey = `resume:parsed:${userId}:${resumeId}`
      await RedisHelper.getClient().del(cacheKey)
      logger.info(`Cache invalidated for user ${userId}, resume ${resumeId}`)
    } catch (error) {
      logger.error(`Failed to invalidate cache: ${error}`)
      // Don't throw - cache invalidation failure shouldn't break the flow
    }
  }
}

export const blobStorageService = new BlobStorageService()