import {
  JWT_SECRET,
  DB_NAME,
  DB_USERNAME,
  DB_PASSWORD,
  MONGO_HOST,
  MONGO_PORT,
  MONGO_MAX_POOL_SIZE,
  MONGO_CONNECTION_TIMEOUT,
  MONGO_SERVER_SELECTION_TIMEOUT,
  REDIS_HOST,
  REDIS_PORT,
  REDIS_PASSWORD,
  REDIS_DB,
  REDIS_CONNECTION_TIMEOUT,
  REDIS_COMMAND_TIMEOUT,
  LOG_LEVEL,
  LOG_MAX_SIZE,
  LOG_MAX_FILES,
  LOG_DIR,
} from './constants'

interface IMongo {
  db: string
  host?: string
  port: number | string
  query_limit: number
  username?: string
  password?: string
  maxPoolSize: number
  connectionTimeout: number
  serverSelectionTimeout: number
}

interface IRedis {
  host: string
  port: number
  password?: string
  db: number
  connectionTimeout: number
  commandTimeout: number
}

interface ILogging {
  level: string
  maxSize: string
  maxFiles: number
  dir: string
}

export const config = {
  mongodb: {
    db: DB_NAME,
    username: DB_USERNAME,
    password: DB_PASSWORD,
    host: MONGO_HOST,
    port: MONGO_PORT,
    query_limit: 100,
    maxPoolSize: MONGO_MAX_POOL_SIZE,
    connectionTimeout: MONGO_CONNECTION_TIMEOUT,
    serverSelectionTimeout: MONGO_SERVER_SELECTION_TIMEOUT,
  } as IMongo,
  redis: {
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    db: REDIS_DB,
    connectionTimeout: REDIS_CONNECTION_TIMEOUT,
    commandTimeout: REDIS_COMMAND_TIMEOUT,
  } as IRedis,
  logging: {
    level: LOG_LEVEL,
    maxSize: LOG_MAX_SIZE,
    maxFiles: LOG_MAX_FILES,
    dir: LOG_DIR,
  } as ILogging,
  jwtSecret: JWT_SECRET,
  maxTimeBeforeExpiry: 2 * 3600,
}

