import * as dotenv from 'dotenv-flow'
import mongoose from 'mongoose'

import { initLogger } from './winston'
import { config } from './settings'

dotenv.config()

const logger = initLogger('mongo.ts')

// Build connection string
const buildConnectionString = (): string => {
  if (process.env.MONGO_URL) {
    return process.env.MONGO_URL
  }
  
  const { mongodb } = config
  const auth = mongodb.username && mongodb.password ? `${mongodb.username}:${mongodb.password}@` : ''
  return `mongodb://${auth}${mongodb.host}:${mongodb.port}/${mongodb.db}`
}

const connectionString = buildConnectionString()

// Validate connection string
const validateConnectionString = (connStr: string): boolean => {
  try {
    const url = new URL(connStr.replace('mongodb://', 'http://'))
    return true
  } catch {
    return false
  }
}

if (!validateConnectionString(connectionString)) {
  logger.error('Invalid MongoDB connection string format')
  process.exit(1)
}

// Connection options
const connectionOptions = {
  maxPoolSize: config.mongodb.maxPoolSize,
  serverSelectionTimeoutMS: config.mongodb.serverSelectionTimeout,
  connectTimeoutMS: config.mongodb.connectionTimeout,
  socketTimeoutMS: 45000,
  bufferCommands: false,
  maxIdleTimeMS: 30000,
  retryWrites: true,
}

mongoose.Promise = global.Promise

// Setup connection event handlers
mongoose.connection.on('connected', () => {
  logger.info(`Mongoose connected to ${connectionString.replace(/\/\/.*@/, '//***@')}`)
})

mongoose.connection.on('error', (err) => {
  logger.error(`Mongoose connection error: ${err}`)
})

mongoose.connection.on('disconnected', () => {
  logger.warn('Mongoose disconnected')
})

mongoose.connection.on('reconnected', () => {
  logger.info('Mongoose reconnected')
})

// Graceful shutdown
const gracefulShutdown = async (msg: string): Promise<void> => {
  await mongoose.connection.close()
  logger.info(`Mongoose disconnected through ${msg}`)
  process.exit(0)
}

process.on('SIGINT', () => gracefulShutdown('app termination'))
process.on('SIGTERM', () => gracefulShutdown('app termination'))
process.on('SIGUSR2', () => gracefulShutdown('nodemon restart'))

const mongo = async (): Promise<typeof mongoose> => {
  try {
    logger.info('Attempting to connect to MongoDB...')
    const connection = await mongoose.connect(connectionString, connectionOptions)
    logger.info('MongoDB connection established successfully')
    return connection
  } catch (err) {
    logger.error(`MongoDB connection failed: ${err}`)
    
    if (process.env.NODE_ENV === 'production') {
      // In production, exit the process
      process.exit(1)
    } else {
      // In development, throw the error to allow for debugging
      throw err
    }
  }
}

export { mongo, connectionString as getConnectionString }
