import * as dotenv from 'dotenv-flow'

dotenv.config()

// JWT Configuration
export const JWT_SECRET = process.env.JWT_SECRET || 'capri-s0on3-default-jwt-secret-change-in-production'

// MongoDB Configuration
export const DB_NAME = process.env.DB_NAME || 'roman-ai'
export const DB_USERNAME = process.env.DB_USERNAME || 'roman'
export const DB_PASSWORD = process.env.DB_PASSWORD || 'roman'
export const MONGO_HOST = process.env.MONGO_HOST || 'localhost'
export const MONGO_PORT = process.env.MONGO_PORT || 27017
export const MONGO_MAX_POOL_SIZE = parseInt(process.env.MONGO_MAX_POOL_SIZE || '10', 10)
export const MONGO_CONNECTION_TIMEOUT = parseInt(process.env.MONGO_CONNECTION_TIMEOUT || '30000', 10)
export const MONGO_SERVER_SELECTION_TIMEOUT = parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT || '30000', 10)

// Redis Configuration
export const REDIS_HOST = process.env.REDIS_HOST || 'localhost'
export const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10)
export const REDIS_PASSWORD = process.env.REDIS_PASSWORD
export const REDIS_DB = parseInt(process.env.REDIS_DB || '0', 10)
export const REDIS_CONNECTION_TIMEOUT = parseInt(process.env.REDIS_CONNECTION_TIMEOUT || '5000', 10)
export const REDIS_COMMAND_TIMEOUT = parseInt(process.env.REDIS_COMMAND_TIMEOUT || '5000', 10)

// Winston/Logging Configuration
export const LOG_LEVEL = process.env.LOG_LEVEL || 'info'
export const LOG_MAX_SIZE = process.env.LOG_MAX_SIZE || '5242880' // 5MB
export const LOG_MAX_FILES = parseInt(process.env.LOG_MAX_FILES || '5', 10)
export const LOG_DIR = process.env.LOG_DIR || 'logs'

// Resume Configuration
export const RESUME_LIMIT_PER_USER = parseInt(process.env.RESUME_LIMIT_PER_USER || '3', 10)
export const RESUME_CACHE_TTL_HOURS = parseInt(process.env.RESUME_CACHE_TTL_HOURS || '72', 10)
