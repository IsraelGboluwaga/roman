import { ResumeGenerator } from '../resumeGenerator.service'
import * as resumeService from '../../business-logic/resume.service'
import Anthropic from '@anthropic-ai/sdk'

jest.mock('../../business-logic/resume.service')
jest.mock('@anthropic-ai/sdk')
jest.mock('../../../config/winston', () => ({
  initLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  })
}))

jest.mock('../../storage/blobStorage.service', () => ({
  blobStorageService: {
    getCachedResumeData: jest.fn()
  }
}))

jest.mock('../../data-extraction/resumeParser', () => ({
  ResumeParser: {
    parseFromBlob: jest.fn(),
    parseFromUrl: jest.fn()
  }
}))

jest.mock('../../../config/gridfs', () => ({
  getGridFSBucket: jest.fn(),
  initGridFS: jest.fn()
}))

const mockGetResume = resumeService.getResume as jest.MockedFunction<typeof resumeService.getResume>
const mockAnthropicCreate = jest.fn()

// Mock Anthropic constructor
const MockAnthropic = Anthropic as jest.MockedClass<typeof Anthropic>
MockAnthropic.mockImplementation(() => ({
  messages: {
    create: mockAnthropicCreate
  }
}) as any)

describe('ResumeGenerator Service', () => {
  const mockResumeData = {
    id: 'resume123',
    userId: 'user123',
    active: true,
    fileUrl: 'https://example.com/resume.pdf',
    title: 'Software Engineer Resume',
    blobId: 'blob123',
    parsedText: 'John Doe\nSoftware Engineer\nSkills: JavaScript, React, Node.js',
    structuredData: {
      name: 'John Doe',
      email: 'john@example.com',
      skills: ['JavaScript', 'React', 'Node.js'],
      experience: ['Software Engineer at TechCorp']
    },
    created: new Date(),
    modified: new Date()
  }

  const mockJobDescription = `
    We are looking for a Senior React Developer with experience in:
    - React.js and TypeScript
    - Node.js backend development
    - GraphQL and REST APIs
    - Agile development methodologies
  `

  beforeEach(() => {
    jest.clearAllMocks()
    // Set environment variable for tests (must be at least 20 chars for validation)
    process.env.ANTHROPIC_API_KEY = 'test-api-key-for-testing-12345'
  })

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY
  })

  describe('generateResume', () => {
    it('should throw error when resume has no parsed data', async () => {
      const incompleteResume = { ...mockResumeData, parsedText: undefined }
      mockGetResume.mockResolvedValue(incompleteResume)

      await expect(ResumeGenerator.generateResume({
        resumeId: 'resume123',
        jobDescription: mockJobDescription
      })).rejects.toThrow('Resume does not have parsed data')

      expect(mockGetResume).toHaveBeenCalledWith('resume123')
    })

    it('should fetch resume data successfully', async () => {
      mockGetResume.mockResolvedValue(mockResumeData)
      mockAnthropicCreate.mockResolvedValue({
        content: [{
          type: 'text',
          text: 'Optimized resume content here'
        }]
      })
      
      const generatePromise = ResumeGenerator.generateResume({
        resumeId: 'resume123',
        jobDescription: mockJobDescription
      })

      // Should throw at formatting stage since it's not implemented yet
      await expect(generatePromise).rejects.toThrow('Document formatting not yet implemented')
      
      // But should have fetched resume data first
      expect(mockGetResume).toHaveBeenCalledWith('resume123')
    })

    it('should call Anthropic API with proper prompt structure', async () => {
      mockGetResume.mockResolvedValue(mockResumeData)
      mockAnthropicCreate.mockResolvedValue({
        content: [{
          type: 'text',
          text: 'Optimized resume content here'
        }]
      })

      const generatePromise = ResumeGenerator.generateResume({
        resumeId: 'resume123',
        jobDescription: mockJobDescription
      })

      // Should throw at formatting stage
      await expect(generatePromise).rejects.toThrow('Document formatting not yet implemented')
      
      // But should have called Anthropic API
      expect(mockAnthropicCreate).toHaveBeenCalledWith({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: expect.stringContaining('You are an expert resume writer')
        }]
      })

      const calledPrompt = mockAnthropicCreate.mock.calls[0][0].messages[0].content
      expect(calledPrompt).toContain(mockResumeData.parsedText)
      expect(calledPrompt).toContain(mockJobDescription)
      expect(calledPrompt).toContain('John Doe')
    })

    it('should handle Anthropic API errors', async () => {
      mockGetResume.mockResolvedValue(mockResumeData)
      mockAnthropicCreate.mockRejectedValue(new Error('API rate limit exceeded'))

      await expect(ResumeGenerator.generateResume({
        resumeId: 'resume123',
        jobDescription: mockJobDescription
      })).rejects.toThrow('API rate limit exceeded')
    })

    it('should handle invalid Anthropic response type', async () => {
      mockGetResume.mockResolvedValue(mockResumeData)
      mockAnthropicCreate.mockResolvedValue({
        content: [{
          type: 'image', // Invalid type
          text: 'Some content'
        }]
      })

      await expect(ResumeGenerator.generateResume({
        resumeId: 'resume123',
        jobDescription: mockJobDescription
      })).rejects.toThrow('Unexpected response type from AI')
    })
  })
})