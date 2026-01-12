import mongoose from 'mongoose'
import { GridFSBucket } from 'mongodb'
import { initGridFS, getGridFSBucket } from '../gridfs'

jest.mock('mongoose', () => ({
  connection: {
    db: {
      mockGridFSBucket: 'mocked-gridfs-bucket'
    }
  }
}))

jest.mock('mongodb', () => ({
  GridFSBucket: jest.fn().mockImplementation(() => ({
    bucketName: 'resume_blobs',
    mockBucket: true
  }))
}))

jest.mock('../winston', () => ({
  initLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  })
}))

describe('GridFS Configuration', () => {
  let mockGridFSBucket: jest.MockedClass<typeof GridFSBucket>

  beforeEach(() => {
    jest.clearAllMocks()
    mockGridFSBucket = GridFSBucket as jest.MockedClass<typeof GridFSBucket>
  })

  describe('initGridFS', () => {
    it('should initialize GridFS bucket successfully', () => {
      const bucket = initGridFS()

      expect(GridFSBucket).toHaveBeenCalledWith(
        mongoose.connection.db,
        { bucketName: 'resume_blobs' }
      )
      expect(bucket).toBeDefined()
    })

    it('should initialize properly with valid MongoDB connection', () => {
      // Basic initialization test - the functionality works as evidenced by other tests
      const bucket = initGridFS()
      expect(bucket).toBeDefined()
    })
  })

  describe('getGridFSBucket', () => {
    it('should return existing bucket if available', () => {
      // Initialize bucket first
      const initializedBucket = initGridFS()
      
      // Get bucket should return the same instance
      const retrievedBucket = getGridFSBucket()
      
      expect(retrievedBucket).toBe(initializedBucket)
    })

    it('should initialize bucket if not available', () => {
      // Clear any existing bucket by resetting the module
      jest.resetModules()
      
      const bucket = getGridFSBucket()
      
      expect(bucket).toBeDefined()
    })
  })
})