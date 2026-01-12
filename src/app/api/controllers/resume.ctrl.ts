import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { initLogger } from '../../config/winston'
import { RomanAPIError } from '../../handlers/errors'
import { addResume, getResume, generateResume, getActiveResume, getAllResumes, setActiveResume, deleteResume } from '../../services/business-logic/resume.service'
import { AuthenticatedRequest } from '../middleware/auth.middleware'
import { CreatedResponse, DataResponse } from '../middleware'

const logger = initLogger('resume.ctrl.ts')

export const handleAddResume = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  logger.info('🚨 Attempting to add resume...')
  
  const { userId, fileUrl, title, setAsActive } = req.body

  if (!userId || !fileUrl) {
    throw new RomanAPIError({
      message: 'userId and fileUrl are required',
      status: StatusCodes.BAD_REQUEST,
    })
  }

  // Add resume to database
  const resumeId = await addResume({
    userId,
    fileUrl,
    title,
    setAsActive
  })

  const processedResume = {
    id: resumeId,
    userId,
    fileUrl,
    title,
    setAsActive
  }

  logger.info('🚀 Resume added successfully!')
  res.locals.result = new CreatedResponse(processedResume, 'Resume added successfully')
}

export const handleGetResume = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  logger.info('🚨 Attempting to fetch resume...')

  const { id } = req.params

  if (!id) {
    throw new RomanAPIError({
      message: 'Resume ID is required',
      status: StatusCodes.BAD_REQUEST,
    })
  }

  // Fetch resume from database
  const resume = await getResume(id)

  logger.info('🚀 Resume fetched successfully!')
  res.locals.result = new DataResponse(resume)
}

export const handleGenerateResume = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  logger.info('🚨 Attempting to generate resume...')

  const { jobDescription, userId } = req.body

  if (!jobDescription) {
    throw new RomanAPIError({
      message: 'jobDescription is required',
      status: StatusCodes.BAD_REQUEST,
    })
  }

  // Generate resume based on job description
  const generatedResume = await generateResume({
    jobDescription,
    userId // Optional - for anonymous users this will be undefined
  })

  logger.info('🚀 Resume generated successfully!')
  res.locals.result = new DataResponse(generatedResume, 'Resume generated successfully')
}

export const handleGetActiveResume = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  logger.info('🚨 Attempting to fetch active resume...')

  const { userId } = req.query

  if (!userId) {
    throw new RomanAPIError({
      message: 'userId is required',
      status: StatusCodes.BAD_REQUEST,
    })
  }

  const activeResume = await getActiveResume(userId as string)

  if (!activeResume) {
    throw new RomanAPIError({
      message: 'No active resume found for user',
      status: StatusCodes.NOT_FOUND,
    })
  }

  logger.info('🚀 Active resume fetched successfully!')
  res.locals.result = new DataResponse(activeResume)
}

export const handleGetAllResumes = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  logger.info('🚨 Attempting to fetch all resumes...')

  const { userId } = req.query

  if (!userId) {
    throw new RomanAPIError({
      message: 'userId is required',
      status: StatusCodes.BAD_REQUEST,
    })
  }

  const resumes = await getAllResumes(userId as string)

  logger.info('🚀 All resumes fetched successfully!')
  res.locals.result = new DataResponse(resumes)
}

export const handleSetActiveResume = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  logger.info('🚨 Attempting to set active resume...')

  const { id } = req.params
  const { userId } = req.body

  if (!userId) {
    throw new RomanAPIError({
      message: 'userId is required',
      status: StatusCodes.BAD_REQUEST,
    })
  }

  if (!id) {
    throw new RomanAPIError({
      message: 'Resume ID is required',
      status: StatusCodes.BAD_REQUEST,
    })
  }

  await setActiveResume(userId, id)

  logger.info('🚀 Resume set as active successfully!')
  res.locals.result = new DataResponse({ resumeId: id, active: true }, 'Resume set as active successfully')
}

export const handleDeleteResume = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  logger.info('🚨 Attempting to delete resume...')

  const { id } = req.params
  const { userId } = req.body

  if (!userId) {
    throw new RomanAPIError({
      message: 'userId is required',
      status: StatusCodes.BAD_REQUEST,
    })
  }

  if (!id) {
    throw new RomanAPIError({
      message: 'Resume ID is required',
      status: StatusCodes.BAD_REQUEST,
    })
  }

  await deleteResume(userId, id)

  logger.info('🚀 Resume deleted successfully!')
  res.locals.result = new DataResponse({ resumeId: id, deleted: true }, 'Resume deleted successfully')
}
