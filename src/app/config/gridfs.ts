import mongoose from 'mongoose'
import { GridFSBucket } from 'mongodb'
import { initLogger } from './winston'

const logger = initLogger('gridfs.ts')

let bucket: GridFSBucket

export const initGridFS = (): GridFSBucket => {
  if (!bucket) {
    const db = mongoose.connection.db
    if (!db) {
      throw new Error('MongoDB connection not established')
    }
    
    bucket = new GridFSBucket(db, {
      bucketName: 'resume_blobs'
    })
    
    logger.info('GridFS bucket initialized for resume blobs')
  }
  
  return bucket
}

export const getGridFSBucket = (): GridFSBucket => {
  if (!bucket) {
    return initGridFS()
  }
  return bucket
}