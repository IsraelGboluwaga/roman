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
  bufferMaxEntries: 0,
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

interface TreeNode {
  tag: string
  id?: string
  children: TreeNode[]
}

function areTreesEqual(tree1?: TreeNode, tree2?: TreeNode) {
  if (!tree1 && !tree2) return true

  if (!tree1 || !tree2) return false

  if (tree1.id !== tree2.id || tree1.tag !== tree1.tag) return false

  for (let i = 0; i < tree1.children.length; i++) {
    if (!areTreesEqual(tree1.children[i], tree2.children[i])) {
      return false
    }
  }

  return true
}

function findNodeById(root: TreeNode | null, targetId: string): TreeNode | null {
  if (!root) return null
  if (root.id === targetId) return root

  for (let i = 0; i < root.children.length; i++) {
    const found = findNodeById(root.children[i], targetId)
    if (found) return found
  }

  return null
}

function maxDepth (root: TreeNode | null): number {
  if (!root) return 0
  if (!root.children.length) return 1
  let max = 1

  for (const child of root.children) {
    max = Math.max(maxDepth(child), max)
  }

  return 1 + max
}

function getLeaves(root: TreeNode | null): TreeNode[] {
  if (!root) return []

  if (!root.children.length) return []

  const leaves = []

  for (const child of root.children) {
    leaves.push(...getLeaves(child))
  }

  return leaves
}

interface DiffResult {
  added: TreeNode[];
  removed: TreeNode[];
  modified: TreeNode[];
}

function diffTrees(oldTree: TreeNode | null, newTree: TreeNode | null): DiffResult {
  const result: DiffResult = {
    added: [],
    removed: [],
    modified: []
  }

  if (oldTree && !newTree) {
    result.removed.push(oldTree)
    return result
  }

  if (!oldTree && newTree) {
    result.added.push(newTree)
    return result
  }

  if (!oldTree && !newTree) return result

  if (oldTree?.id === newTree?.id && newTree?.tag !== newTree?.tag) {
    result.modified.push(newTree as TreeNode)
  }

  const oldChildrenMap = new Map(
    oldTree?.children.filter(t => t.id).map(t => [t.id!, t])
  )

  const newChildrenMap = new Map(
    newTree?.children.filter(t => t.id).map(t => [t.id!, t])
  )

  for (const [id, child] of newChildrenMap) {
    if (!oldChildrenMap.has(id)) {
      result.added.push(child)
    } else {
      const childDiff = diffTrees(oldChildrenMap.get(id)!, child)
      result.added.push(...childDiff.added)
      result.removed.push(...childDiff.removed)
      result.modified.push(...childDiff.modified)
    }
  }

  return result
}