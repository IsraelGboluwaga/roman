import * as rootPath from 'app-root-path'
import * as winston from 'winston'
import * as fs from 'fs'
import * as path from 'path'
import { config } from './settings'

const { format } = winston
const { align, colorize, combine, label, prettyPrint, printf, timestamp } = format

// Ensure logs directory exists
const logsDir = path.join(rootPath.toString(), config.logging.dir)
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
}

const fileOptions = {
  filename: path.join(logsDir, 'app.log'),
  maxsize: parseInt(config.logging.maxSize, 10),
  maxFiles: config.logging.maxFiles,
  format: combine(
    timestamp(),
    align(),
    printf((info: winston.Logform.TransformableInfo) => `${info.level}: ${info.label} : ${info.timestamp}: ${info.message}`)
  ),
}

const transports: winston.transport[] = [
  new winston.transports.Console({
    level: config.logging.level,
  })
]
if (process.env.NODE_ENV === 'development') {
  transports.push(new winston.transports.File(fileOptions))
}

const logConfiguration = (fileName: string): winston.LoggerOptions => ({
  transports,
  format: combine(
    label({
      label: `🔊 {${fileName}}`,
    }),
    timestamp(),
    colorize(),
    printf(
      (info: winston.Logform.TransformableInfo) =>
        `${info.timestamp} [${info.level}] ${info.label}: ${info.message}`
    )
  ),
})

const initLogger = (fileName: string): winston.Logger => winston.createLogger(logConfiguration(fileName))

interface MorganStream {
  write: (message: string, encoding?: string) => void
}

// This is for app logs
const logger = initLogger('API')
const loggerStream: MorganStream = {
  write: function(message: string, encoding = 'utf-8'): void {
    // use the 'info' log level so the output will be picked up by both
    // transports (file and console)
    logger.info(message.trim())
  },
}

// Add the stream property to logger for morgan compatibility
;(logger as winston.Logger & { morganStream: MorganStream }).morganStream = loggerStream

export { initLogger, logger, loggerStream }