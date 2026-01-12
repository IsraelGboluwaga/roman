import bluebird from 'bluebird'
import * as bodyParser from 'body-parser'
import express from 'express'
import morgan from 'morgan'
import dotenv from 'dotenv'

import { routes } from './api/routes'
import { mongo } from './config/mongo'
import { logger, loggerStream } from './config/winston'

dotenv.config()

const server = express()
const PORT = process.env.PORT || 3000

server.use(morgan('combined', { stream: loggerStream }))
server.use(bodyParser.json())
server.use(bodyParser.urlencoded({ extended: true }))

mongo()

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
routes(server)

server.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): void => {
    err.status = 404
    logger.error(
      `${err.status} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`
    )
    next(err)
  }
)

server.listen(PORT, (): void => {
  console.log(`Server running on port ${PORT}`)
})
