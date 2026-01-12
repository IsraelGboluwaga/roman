import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

jest.mock('../../../services/business-logic/resume.service')
jest.mock('../../../config/winston')
jest.mock('../../../config/gridfs')
jest.mock('../../../config/constants', () => ({
  RESUME_CACHE_TTL_HOURS: 72,
  RESUME_LIMIT_PER_USER: 3
}))
jest.mock('../../../services/storage/blobStorage.service')
jest.mock('../../../services/data-extraction/resumeParser')
jest.mock('../../../handlers/responses', () => ({
  success: jest.fn(),
  failure: jest.fn()
}))

import { handleAddResume, handleGetResume } from '../resume.ctrl'
import * as resumeService from '../../../services/business-logic/resume.service'
import { success, failure } from '../../../handlers/responses'

const mockAddResume = resumeService.addResume as jest.MockedFunction<typeof resumeService.addResume>
const mockGetResume = resumeService.getResume as jest.MockedFunction<typeof resumeService.getResume>
const mockSuccess = success as jest.MockedFunction<typeof success>
const mockFailure = failure as jest.MockedFunction<typeof failure>

describe('Resume Controller', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>

  beforeEach(() => {
    mockResponse = {}
    mockRequest = {}
    jest.clearAllMocks()
  })

  describe('handleAddResume', () => {
    it('should successfully add a resume when all required fields are provided', async () => {
      const mockResumeId = '507f1f77bcf86cd799439011'
      mockRequest.body = {
        userId: 'user123',
        fileUrl: 'https://example.com/resume.pdf',
        title: 'My Resume'
      }

      mockAddResume.mockResolvedValue(mockResumeId)

      await handleAddResume(mockRequest as Request, mockResponse as Response)

      expect(mockSuccess).toHaveBeenCalledWith({
        res: mockResponse,
        data: {
          id: mockResumeId,
          userId: 'user123',
          fileUrl: 'https://example.com/resume.pdf',
          title: 'My Resume',
          setAsActive: undefined
        },
        httpCode: StatusCodes.CREATED,
        message: 'Resume added successfully'
      })
    })

    it('should return 400 when userId is missing', async () => {
      mockRequest.body = {
        fileUrl: 'https://example.com/resume.pdf'
      }

      await handleAddResume(mockRequest as Request, mockResponse as Response)

      expect(mockAddResume).not.toHaveBeenCalled()
      expect(mockFailure).toHaveBeenCalledWith(
        expect.objectContaining({
          res: mockResponse,
          message: 'userId and fileUrl are required',
          httpCode: StatusCodes.INTERNAL_SERVER_ERROR,
          error: expect.any(Object)
        })
      )
    })
  })

  describe('handleGetResume', () => {
    it('should successfully fetch a resume by id', async () => {
      const mockResumeId = '507f1f77bcf86cd799439011'
      const mockResumeData = {
        id: mockResumeId,
        userId: 'user123',
        active: true,
        fileUrl: 'https://example.com/resume.pdf',
        title: 'My Resume',
        blobId: 'blob123',
        parsedText: 'Mock parsed resume text',
        structuredData: {
          name: 'John Doe',
          email: 'john@example.com',
          skills: ['JavaScript', 'React']
        },
        created: new Date(),
        modified: new Date()
      }

      mockRequest.params = { id: mockResumeId }
      mockGetResume.mockResolvedValue(mockResumeData)

      await handleGetResume(mockRequest as Request, mockResponse as Response)

      expect(mockSuccess).toHaveBeenCalledWith({
        res: mockResponse,
        data: mockResumeData,
        httpCode: StatusCodes.OK
      })
    })

    it('should return 400 when id parameter is missing', async () => {
      mockRequest.params = {}

      await handleGetResume(mockRequest as Request, mockResponse as Response)

      expect(mockGetResume).not.toHaveBeenCalled()
      expect(mockFailure).toHaveBeenCalledWith(
        expect.objectContaining({
          res: mockResponse,
          message: 'Resume ID is required',
          httpCode: StatusCodes.INTERNAL_SERVER_ERROR,
          error: expect.any(Object)
        })
      )
    })
  })
})