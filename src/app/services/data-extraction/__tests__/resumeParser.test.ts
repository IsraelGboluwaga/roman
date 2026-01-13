// Mock external dependencies first before any imports
jest.mock('axios')
jest.mock('@anthropic-ai/sdk', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: {
        create: jest.fn(),
      },
    })),
  }
})
jest.mock('pdf-parse', () => jest.fn())
jest.mock('mammoth', () => ({
  extractRawText: jest.fn()
}))
jest.mock('../../../config/winston', () => ({
  initLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })
}))

jest.mock('../../storage/blobStorage.service', () => ({
  blobStorageService: {
    storeBlob: jest.fn(),
    getBlob: jest.fn(),
    getCachedResumeData: jest.fn(),
    cacheResumeData: jest.fn()
  }
}))

import { ResumeParser, ParseResult } from '../resumeParser'

import axios from 'axios'
import Anthropic from '@anthropic-ai/sdk'
import pdfParse from 'pdf-parse'
import * as mammoth from 'mammoth'
import { initLogger } from '../../../config/winston'
import { blobStorageService } from '../../storage/blobStorage.service'

const mockAxios = axios as jest.Mocked<typeof axios>
const mockPdfParse = pdfParse as jest.MockedFunction<typeof pdfParse>
const mockMammoth = mammoth as jest.Mocked<typeof mammoth>
const mockInitLogger = initLogger as jest.MockedFunction<typeof initLogger>

// Get the mocked logger instance
const mockLogger = mockInitLogger('resume-parser.ts')

// Mock Anthropic instance
const mockAnthropicCreate = jest.fn()

const mockAnthropic = Anthropic as jest.MockedClass<typeof Anthropic>
mockAnthropic.mockImplementation(() => ({
  messages: {
    create: mockAnthropicCreate
  }
}) as any)
const mockBlobStorageService = blobStorageService as jest.Mocked<typeof blobStorageService>

describe('ResumeParser', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Set environment variable for tests (must be at least 20 chars for validation)
    process.env.ANTHROPIC_API_KEY = 'test-api-key-for-testing-12345'
    
    // Mock blob storage service methods
    mockBlobStorageService.getCachedResumeData.mockResolvedValue(null)
    mockBlobStorageService.storeBlob.mockResolvedValue({
      id: 'mock-blob-id',
      filename: 'test.pdf',
      contentType: 'application/pdf',
      size: 1024,
      uploadDate: new Date(),
      metadata: {}
    })
    mockBlobStorageService.cacheResumeData.mockResolvedValue()
  })

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY
  })

  describe('parseFromUrl', () => {
    const mockFileUrl = 'https://example.com/resume.pdf'
    const mockPdfBuffer = Buffer.from('%PDF-1.4 mock pdf content')
    const mockImageBuffer = Buffer.from('mock image content')
    // DOCX signature: ZIP file with specific structure
    const mockDocxBuffer = Buffer.from([0x50, 0x4B, 0x03, 0x04, ...Array(100).fill(0), ...Buffer.from('word/document.xml')])
    // DOC signature: OLE2 compound document
    const mockDocBuffer = Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1, ...Array(100).fill(0)])
    
    beforeEach(() => {
      mockAxios.get.mockResolvedValue({
        data: mockPdfBuffer,
      })
    })

    it('should successfully parse a PDF resume from URL', async () => {
      const mockExtractedText = 'John Doe\nSoftware Engineer\njohn@example.com\n555-1234\nPython, JavaScript, React'
      const mockClaudeResponse = {
        text: 'John Doe Software Engineer john@example.com 555-1234 Python, JavaScript, React',
        structuredData: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '555-1234',
          skills: ['Python', 'JavaScript', 'React'],
          experience: ['Software Engineer at Tech Corp'],
          education: ['BS Computer Science']
        }
      }

      mockPdfParse.mockResolvedValue({ text: mockExtractedText } as any)
      mockAnthropicCreate.mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify(mockClaudeResponse)
        }]
      } as any)

      const result = await ResumeParser.parseFromUrl(mockFileUrl)

      expect(mockAxios.get).toHaveBeenCalledWith(mockFileUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })
      expect(mockPdfParse).toHaveBeenCalledWith(mockPdfBuffer)
      expect(mockAnthropicCreate).toHaveBeenCalledWith({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        messages: expect.arrayContaining([{
          role: 'user',
          content: expect.stringContaining(mockExtractedText)
        }])
      })

      expect(result).toEqual({
        text: mockClaudeResponse.text,
        structuredData: mockClaudeResponse.structuredData,
        fileType: 'pdf',
        blobId: 'mock-blob-id'
      })
      
      expect(mockBlobStorageService.storeBlob).toHaveBeenCalledWith(
        mockPdfBuffer,
        expect.stringContaining('resume_'),
        'application/pdf',
        { userId: undefined, resumeId: undefined, originalUrl: mockFileUrl }
      )
    })

    it('should successfully parse an image resume from URL', async () => {
      const mockClaudeResponse = {
        text: 'Jane Smith Marketing Manager jane@example.com 555-5678',
        structuredData: {
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '555-5678',
          skills: ['Marketing', 'Analytics'],
          experience: ['Marketing Manager at Corp Inc'],
          education: ['MBA Marketing']
        }
      }

      mockAxios.get.mockResolvedValue({ data: mockImageBuffer })
      mockAnthropicCreate.mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify(mockClaudeResponse)
        }]
      } as any)

      const result = await ResumeParser.parseFromUrl(mockFileUrl)

      expect(mockAnthropicCreate).toHaveBeenCalledWith({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: [{
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: mockImageBuffer.toString('base64')
            }
          }, {
            type: 'text',
            text: expect.stringContaining('extract and structure all text from this resume image')
          }]
        }]
      })

      expect(result).toEqual({
        text: mockClaudeResponse.text,
        structuredData: mockClaudeResponse.structuredData,
        fileType: 'image',
        blobId: 'mock-blob-id'
      })
    })

    it('should handle file download errors', async () => {
      const mockError = new Error('Network error')
      mockAxios.get.mockRejectedValue(mockError)

      await expect(ResumeParser.parseFromUrl(mockFileUrl)).rejects.toThrow('Failed to download file: Network error')
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to download file'))
    })

    it('should handle PDF parsing errors', async () => {
      const mockError = new Error('PDF parsing error')
      mockPdfParse.mockRejectedValue(mockError)

      await expect(ResumeParser.parseFromUrl(mockFileUrl)).rejects.toThrow('Failed to extract PDF text: PDF parsing error')
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to extract PDF text'))
    })

    it('should handle Claude API errors', async () => {
      const mockExtractedText = 'Test resume text'
      mockPdfParse.mockResolvedValue({ text: mockExtractedText } as any)
      
      const mockError = new Error('Claude API error')
      mockAnthropicCreate.mockRejectedValue(mockError)

      await expect(ResumeParser.parseFromUrl(mockFileUrl)).rejects.toThrow('Claude parsing failed: Claude API error')
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Claude parsing failed'))
    })

    it('should handle invalid JSON response from Claude', async () => {
      const mockExtractedText = 'Test resume text'
      mockPdfParse.mockResolvedValue({ text: mockExtractedText } as any)
      mockAnthropicCreate.mockResolvedValue({
        content: [{
          type: 'text',
          text: 'Invalid JSON response'
        }]
      } as any)

      const result = await ResumeParser.parseFromUrl(mockFileUrl)

      expect(result).toEqual({
        text: 'Invalid JSON response',
        structuredData: {},
        fileType: 'pdf',
        blobId: 'mock-blob-id'
      })
      expect(mockLogger.warn).toHaveBeenCalledWith('Failed to parse Claude response as JSON, using raw text')
    })

    it('should correctly detect PDF file type', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4 test content')
      mockAxios.get.mockResolvedValue({ data: pdfBuffer })
      mockPdfParse.mockResolvedValue({ text: 'test' } as any)
      mockAnthropicCreate.mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify({ text: 'test', structuredData: {} })
        }]
      } as any)

      const result = await ResumeParser.parseFromUrl(mockFileUrl)
      expect(result.fileType).toBe('pdf')
    })

    it('should correctly detect image file type', async () => {
      const imageBuffer = Buffer.from('PNG image data')
      mockAxios.get.mockResolvedValue({ data: imageBuffer })
      mockAnthropicCreate.mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify({ text: 'test', structuredData: {} })
        }]
      } as any)

      const result = await ResumeParser.parseFromUrl(mockFileUrl)
      expect(result.fileType).toBe('image')
    })

    it('should successfully parse a DOCX resume from URL', async () => {
      const mockExtractedText = 'John Doe\nSoftware Engineer\njohn@example.com\n555-1234\nPython, JavaScript, React'
      const mockClaudeResponse = {
        text: 'John Doe Software Engineer john@example.com 555-1234 Python, JavaScript, React',
        structuredData: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '555-1234',
          skills: ['Python', 'JavaScript', 'React'],
          experience: ['Software Engineer at Tech Corp'],
          education: ['BS Computer Science']
        }
      }

      mockAxios.get.mockResolvedValue({ data: mockDocxBuffer })
      mockMammoth.extractRawText.mockResolvedValue({ 
        value: mockExtractedText,
        messages: []
      })
      mockAnthropicCreate.mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify(mockClaudeResponse)
        }]
      } as any)

      const result = await ResumeParser.parseFromUrl(mockFileUrl)

      expect(mockMammoth.extractRawText).toHaveBeenCalledWith({ buffer: mockDocxBuffer })
      expect(result).toEqual({
        text: mockClaudeResponse.text,
        structuredData: mockClaudeResponse.structuredData,
        fileType: 'docx',
        blobId: 'mock-blob-id'
      })
      
      expect(mockBlobStorageService.storeBlob).toHaveBeenCalledWith(
        mockDocxBuffer,
        expect.stringContaining('resume_'),
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        { userId: undefined, resumeId: undefined, originalUrl: mockFileUrl }
      )
    })

    it('should successfully parse a DOC resume from URL', async () => {
      const mockExtractedText = 'Jane Smith\nMarketing Manager\njane@example.com\n555-5678'
      const mockClaudeResponse = {
        text: 'Jane Smith Marketing Manager jane@example.com 555-5678',
        structuredData: {
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '555-5678',
          skills: ['Marketing', 'Analytics'],
          experience: ['Marketing Manager at Corp Inc'],
          education: ['MBA Marketing']
        }
      }

      mockAxios.get.mockResolvedValue({ data: mockDocBuffer })
      mockMammoth.extractRawText.mockResolvedValue({ 
        value: mockExtractedText,
        messages: []
      })
      mockAnthropicCreate.mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify(mockClaudeResponse)
        }]
      } as any)

      const result = await ResumeParser.parseFromUrl(mockFileUrl)

      expect(mockMammoth.extractRawText).toHaveBeenCalledWith({ buffer: mockDocBuffer })
      expect(result).toEqual({
        text: mockClaudeResponse.text,
        structuredData: mockClaudeResponse.structuredData,
        fileType: 'doc',
        blobId: 'mock-blob-id'
      })
      
      expect(mockBlobStorageService.storeBlob).toHaveBeenCalledWith(
        mockDocBuffer,
        expect.stringContaining('resume_'),
        'application/msword',
        { userId: undefined, resumeId: undefined, originalUrl: mockFileUrl }
      )
    })

    it('should handle DOCX parsing errors', async () => {
      const mockError = new Error('DOCX parsing error')
      mockAxios.get.mockResolvedValue({ data: mockDocxBuffer })
      mockMammoth.extractRawText.mockRejectedValue(mockError)

      await expect(ResumeParser.parseFromUrl(mockFileUrl)).rejects.toThrow('Failed to extract DOCX/DOC text: DOCX parsing error')
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to extract DOCX/DOC text'))
    })

    it('should log mammoth warnings when parsing DOCX', async () => {
      const mockExtractedText = 'Test content'
      const mockWarnings: any[] = [{ type: 'warning', message: 'Unsupported element' }]
      
      mockAxios.get.mockResolvedValue({ data: mockDocxBuffer })
      mockMammoth.extractRawText.mockResolvedValue({ 
        value: mockExtractedText,
        messages: mockWarnings
      } as any)
      mockAnthropicCreate.mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify({ text: 'test', structuredData: {} })
        }]
      } as any)

      await ResumeParser.parseFromUrl(mockFileUrl)

      expect(mockLogger.warn).toHaveBeenCalledWith('Mammoth conversion warnings:', mockWarnings)
    })

    it('should correctly detect DOCX file type', async () => {
      mockAxios.get.mockResolvedValue({ data: mockDocxBuffer })
      mockMammoth.extractRawText.mockResolvedValue({ value: 'test', messages: [] })
      mockAnthropicCreate.mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify({ text: 'test', structuredData: {} })
        }]
      } as any)

      const result = await ResumeParser.parseFromUrl(mockFileUrl)
      expect(result.fileType).toBe('docx')
    })

    it('should correctly detect DOC file type', async () => {
      mockAxios.get.mockResolvedValue({ data: mockDocBuffer })
      mockMammoth.extractRawText.mockResolvedValue({ value: 'test', messages: [] })
      mockAnthropicCreate.mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify({ text: 'test', structuredData: {} })
        }]
      } as any)

      const result = await ResumeParser.parseFromUrl(mockFileUrl)
      expect(result.fileType).toBe('doc')
    })

    it('should clean up whitespace in the returned text', async () => {
      const mockExtractedText = 'Test resume text'
      mockPdfParse.mockResolvedValue({ text: mockExtractedText } as any)
      mockAnthropicCreate.mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify({
            text: '  Multiple    spaces   and\n\n\nnewlines  ',
            structuredData: {}
          })
        }]
      } as any)

      const result = await ResumeParser.parseFromUrl(mockFileUrl)
      expect(result.text).toBe('Multiple spaces and newlines')
    })

    it('should use correct timeout and headers for file download', async () => {
      mockPdfParse.mockResolvedValue({ text: 'test' } as any)
      mockAnthropicCreate.mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify({ text: 'test', structuredData: {} })
        }]
      } as any)

      await ResumeParser.parseFromUrl(mockFileUrl)

      expect(mockAxios.get).toHaveBeenCalledWith(mockFileUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })
    })

    it('should log progress messages', async () => {
      mockPdfParse.mockResolvedValue({ text: 'test', info: {} } as any)
      mockAnthropicCreate.mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify({ text: 'test', structuredData: {} })
        }]
      } as any)

      await ResumeParser.parseFromUrl(mockFileUrl)

      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Starting AI-powered resume parsing from URL'))
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Downloading file from URL'))
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('File downloaded successfully'))
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Detected file type'))
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Resume parsing completed successfully'))
    })

    it('should use cached data when available', async () => {
      const userId = 'user123'
      const resumeId = 'resume456'
      const cachedData = {
        parsedText: 'Cached resume text',
        structuredData: { name: 'John Doe' },
        fileType: 'pdf' as const,
        extractedAt: new Date(),
        blobId: 'cached-blob-id'
      }

      mockBlobStorageService.getCachedResumeData.mockResolvedValue(cachedData)

      const result = await ResumeParser.parseFromUrl(mockFileUrl, userId, resumeId)

      expect(mockBlobStorageService.getCachedResumeData).toHaveBeenCalledWith(userId, resumeId)
      expect(mockAxios.get).not.toHaveBeenCalled()
      expect(result).toEqual({
        text: cachedData.parsedText,
        structuredData: cachedData.structuredData,
        fileType: cachedData.fileType,
        blobId: cachedData.blobId
      })
    })

    it('should cache data when userId and resumeId provided', async () => {
      const userId = 'user123'
      const resumeId = 'resume456'
      const mockExtractedText = 'Test resume text'
      const mockClaudeResponse = {
        text: 'Parsed text',
        structuredData: { name: 'John Doe' }
      }

      mockPdfParse.mockResolvedValue({ text: mockExtractedText } as any)
      mockAnthropicCreate.mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify(mockClaudeResponse)
        }]
      } as any)

      await ResumeParser.parseFromUrl(mockFileUrl, userId, resumeId)

      expect(mockBlobStorageService.cacheResumeData).toHaveBeenCalledWith(userId, resumeId, {
        parsedText: mockClaudeResponse.text,
        structuredData: mockClaudeResponse.structuredData,
        fileType: 'pdf',
        extractedAt: expect.any(Date),
        blobId: 'mock-blob-id'
      })
    })
  })

  describe('parseFromBlob', () => {
    const blobId = 'blob123'
    const mockPdfBuffer = Buffer.from('%PDF-1.4 mock pdf content')

    beforeEach(() => {
      mockBlobStorageService.getBlob.mockResolvedValue(mockPdfBuffer)
    })

    it('should successfully parse resume from blob', async () => {
      const mockExtractedText = 'Test resume text'
      const mockClaudeResponse = {
        text: 'Parsed text',
        structuredData: { name: 'John Doe' }
      }

      mockPdfParse.mockResolvedValue({ text: mockExtractedText } as any)
      mockAnthropicCreate.mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify(mockClaudeResponse)
        }]
      } as any)

      const result = await ResumeParser.parseFromBlob(blobId)

      expect(mockBlobStorageService.getBlob).toHaveBeenCalledWith(blobId)
      expect(result).toEqual({
        text: mockClaudeResponse.text,
        structuredData: mockClaudeResponse.structuredData,
        fileType: 'pdf',
        blobId
      })
    })

    it('should use cached data when available for blob parsing', async () => {
      const userId = 'user123'
      const resumeId = 'resume456'
      const cachedData = {
        parsedText: 'Cached resume text',
        structuredData: { name: 'John Doe' },
        fileType: 'pdf' as const,
        extractedAt: new Date(),
        blobId: blobId
      }

      mockBlobStorageService.getCachedResumeData.mockResolvedValue(cachedData)

      const result = await ResumeParser.parseFromBlob(blobId, userId, resumeId)

      expect(mockBlobStorageService.getCachedResumeData).toHaveBeenCalledWith(userId, resumeId)
      expect(mockBlobStorageService.getBlob).not.toHaveBeenCalled()
      expect(result).toEqual({
        text: cachedData.parsedText,
        structuredData: cachedData.structuredData,
        fileType: cachedData.fileType,
        blobId: cachedData.blobId
      })
    })

    it('should handle blob retrieval errors', async () => {
      mockBlobStorageService.getBlob.mockRejectedValue(new Error('Blob not found'))

      await expect(ResumeParser.parseFromBlob(blobId)).rejects.toThrow('Blob not found')
    })
  })
})