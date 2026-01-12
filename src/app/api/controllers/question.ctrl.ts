import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { initLogger } from '../../config/winston'
import { RomanAPIError } from '../../handlers/errors'
import { DataResponse } from '../middleware'

const logger = initLogger('question.ctrl.ts')

export const handleExtractQuestions = async (req: Request, res: Response): Promise<void> => {
  logger.info('🚨 Attempting to extract questions from page...')
  
  const { url, formData } = req.body

  if (!url) {
    throw new RomanAPIError({
      message: 'URL is required for question extraction',
      status: StatusCodes.BAD_REQUEST,
    })
  }

  // TODO: Implement question extraction logic
  const extractedQuestions = {
    id: `questions_${Date.now()}`,
    url,
    questions: [
      // Add extracted questions here
    ],
    extractedAt: new Date().toISOString(),
    formData,
  }

  logger.info('🚀 Questions extracted successfully!')
  res.locals.result = new DataResponse(extractedQuestions, 'Questions extracted successfully')
}

export const handleGetQuestions = async (req: Request, res: Response): Promise<void> => {
  logger.info('🚨 Attempting to fetch questions...')

  // TODO: Implement question fetching logic
  const questions = {
    // Add questions data here
  }

  logger.info('🚀 Questions fetched successfully!')
  res.locals.result = new DataResponse(questions)
}