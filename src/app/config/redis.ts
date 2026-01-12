import * as dotenv from 'dotenv-flow'
import { Redis } from 'ioredis'
import { initLogger } from './winston'
import { config } from './settings'

dotenv.config()

const logger = initLogger('redis.ts')

let client: Redis

const redis = (): Promise<void> => {
  const redisOptions = {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    db: config.redis.db,
    connectTimeout: config.redis.connectionTimeout,
    commandTimeout: config.redis.commandTimeout,
    lazyConnect: true,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
  }
  
  client = new Redis(redisOptions)

  return client
    .connect()
    .then(async (_response: any) => {
      logger.info('Redis connected!')

      // If the Node process ends, close the Redis connection
      process.on('SIGINT', async (): Promise<void> => {
        await client.disconnect()
        logger.error(
          'Redis default connection disconnected through app termination'
        )
        process.exit(0)
      })
    })
    .catch((err: any) => {
      logger.error(`Redis Connection Error: ${err}`)
      process.exit(1)
    })
}

const RedisHelper = {
  setAsync: async (key: string, value: string): Promise<'OK' | null> => await client.set(key, value),
  getAsync: async (key: string): Promise<string | null> => await client.get(key),
  getClient: (): Redis => getClient()
}

const getClient = (): Redis => {
  if (!client) {
    redis()
  }
  return client
}

export { getClient, redis, RedisHelper }
