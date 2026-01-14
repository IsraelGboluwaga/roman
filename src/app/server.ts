import bluebird from 'bluebird'
import * as bodyParser from 'body-parser'
import express from 'express'
import morgan from 'morgan'
import dotenv from 'dotenv'

import { routes } from './api/routes'
import { mongo } from './config/mongo'
import { logger, loggerStream } from './config/winston'
import { setupSwagger } from './config/swagger'
import { errorHandler } from './api/middleware/errorHandling.middleware'

dotenv.config()

const server = express()
const PORT = process.env.PORT || 3000

server.use(morgan('combined', { stream: loggerStream }))
server.use(bodyParser.json())
server.use(bodyParser.urlencoded({ extended: true }))

server.use(
  (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): void => {
    res.header('Access-Control-Allow-Origin', '*')
    res.header(
      'Access-Control-Allow-Methods',
      'GET, POST, PATCH, PUT, DELETE, OPTIONS'
    )
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Authorization, Content-Type, Accept, x-auth-token'
    )
    next()
  }
)

global.Promise = bluebird as any

// Initialize server with async MongoDB connection
;(async () => {
  try {
    // Wait for MongoDB connection before setting up routes
    await mongo()
    
    // Setup Swagger documentation
    setupSwagger(server)
    
    // Setup routes
    routes(server)
    
    // 404 handler for routes not found (plain text)
    server.use((req: express.Request, res: express.Response, next: express.NextFunction): void => {
      logger.warn(`Route not found: ${req.method} ${req.originalUrl}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      })
      res.status(404).send('requested resource not found')
    })
    
    // Global error handler for all other errors (JSON)
    server.use(errorHandler)
    
    // Start server
    server.listen(PORT, (): void => {
      console.log(`🚀 Server running on port ${PORT}`)
      console.log(`📚 API Documentation: http://localhost:${PORT}/docs`)
      console.log(`📄 OpenAPI Spec: http://localhost:${PORT}/docs.json`)
    })
    
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
})()
