import axios from 'axios'
import Anthropic from '@anthropic-ai/sdk'
import pdfParse from 'pdf-parse'
import { initLogger } from '../../config/winston'
import { blobStorageService, CachedResumeData } from '../storage/blobStorage.service'

const logger = initLogger('resume-parser.ts')

export interface ParseResult {
  text: string
  structuredData: {
    name?: string
    email?: string
    phone?: string
    skills?: string[]
    experience?: string[]
    education?: string[]
  }
  fileType: 'pdf' | 'image'
  blobId?: string
}

export class ResumeParser {
  private static getAnthropicClient(): Anthropic {
    const apiKey = process.env.ANTHROPIC_API_KEY
    
    if (!apiKey || apiKey.trim() === '') {
      logger.error('ANTHROPIC_API_KEY environment variable is missing or empty')
      throw new Error('AI service configuration error. Please contact support.')
    }
    
    if (apiKey.length < 20) {
      logger.error('ANTHROPIC_API_KEY appears to be invalid (too short)')
      throw new Error('AI service configuration error. Please contact support.')
    }
    
    return new Anthropic({
      apiKey: apiKey.trim(),
      timeout: 30000,
      maxRetries: 2
    })
  }

  private static async downloadFile(url: string): Promise<Buffer> {
    try {
      logger.info(`Downloading file from URL: ${url}`)
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })
      
      logger.info(`File downloaded successfully, size: ${response.data.length} bytes`)
      return Buffer.from(response.data)
    } catch (error) {
      logger.error(`Failed to download file from ${url}: ${error}`)
      throw new Error(`Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private static async parsePDFText(buffer: Buffer): Promise<string> {
    try {
      logger.info('Extracting text from PDF...')
      const data = await pdfParse(buffer)
      logger.info(`PDF text extracted successfully, ${data.text.length} characters`)
      return data.text
    } catch (error) {
      logger.error(`Failed to extract PDF text: ${error}`)
      throw new Error(`Failed to extract PDF text: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private static async parseWithClaude(content: string | Buffer, fileType: 'pdf' | 'image'): Promise<{ text: string; structuredData: any }> {
    try {
      logger.info(`Parsing ${fileType} with Claude...`)
      
      let messages: any[]
      
      if (fileType === 'pdf') {
        // For PDFs, we send the extracted text
        messages = [{
          role: 'user',
          content: `Please extract and structure the following resume content. Return a JSON object with the following format:
{
  "text": "full resume text cleaned up and formatted",
  "structuredData": {
    "name": "Full Name",
    "email": "email@example.com", 
    "phone": "phone number",
    "skills": ["skill1", "skill2"],
    "experience": ["job1: description", "job2: description"],
    "education": ["degree1", "degree2"]
  }
}

Resume content:
${content}`
        }]
      } else {
        // For images, we send the image data
        const base64Image = (content as Buffer).toString('base64')
        messages = [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: base64Image
              }
            },
            {
              type: 'text',
              text: `Please extract and structure all text from this resume image. Return a JSON object with the following format:
{
  "text": "full resume text extracted and cleaned up",
  "structuredData": {
    "name": "Full Name",
    "email": "email@example.com",
    "phone": "phone number", 
    "skills": ["skill1", "skill2"],
    "experience": ["job1: description", "job2: description"],
    "education": ["degree1", "degree2"]
  }
}`
            }
          ]
        }]
      }

      const anthropic = this.getAnthropicClient()
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        messages
      })

      const responseText = response.content[0].type === 'text' ? response.content[0].text : ''
      
      try {
        const parsed = JSON.parse(responseText)
        logger.info(`Claude parsing completed successfully`)
        return parsed
      } catch (parseError) {
        logger.warn('Failed to parse Claude response as JSON, using raw text')
        return {
          text: responseText,
          structuredData: {}
        }
      }
    } catch (error) {
      logger.error(`Claude parsing failed: ${error}`)
      throw new Error(`Claude parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private static detectFileType(buffer: Buffer): 'pdf' | 'image' {
    if (buffer.length >= 4 && buffer.toString('ascii', 0, 4) === '%PDF') {
      return 'pdf'
    }
    return 'image'
  }

  public static async parseFromUrl(fileUrl: string, userId?: string, resumeId?: string): Promise<ParseResult> {
    try {
      logger.info(`Starting AI-powered resume parsing from URL: ${fileUrl}`)
      
      // Check cache if userId and resumeId provided
      if (userId && resumeId) {
        const cachedData = await blobStorageService.getCachedResumeData(userId, resumeId)
        if (cachedData) {
          logger.info(`Using cached resume data for user ${userId}, resume ${resumeId}`)
          return {
            text: cachedData.parsedText,
            structuredData: cachedData.structuredData,
            fileType: cachedData.fileType,
            blobId: cachedData.blobId
          }
        }
      }
      
      const buffer = await this.downloadFile(fileUrl)
      const fileType = this.detectFileType(buffer)
      logger.info(`Detected file type: ${fileType}`)
      
      // Store blob in GridFS
      const filename = `resume_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileType === 'pdf' ? 'pdf' : 'png'}`
      const contentType = fileType === 'pdf' ? 'application/pdf' : 'image/png'
      const storedBlob = await blobStorageService.storeBlob(
        buffer,
        filename,
        contentType,
        { userId, resumeId, originalUrl: fileUrl }
      )
      
      let content: string | Buffer
      
      if (fileType === 'pdf') {
        content = await this.parsePDFText(buffer)
      } else {
        content = buffer
      }
      
      const { text, structuredData } = await this.parseWithClaude(content, fileType)
      
      const result: ParseResult = {
        text: text.replace(/\s+/g, ' ').trim(),
        structuredData,
        fileType,
        blobId: storedBlob.id
      }
      
      // Cache the parsed data if userId and resumeId provided
      if (userId && resumeId) {
        const cacheData: CachedResumeData = {
          parsedText: result.text,
          structuredData: result.structuredData,
          fileType: result.fileType,
          extractedAt: new Date(),
          blobId: storedBlob.id
        }
        await blobStorageService.cacheResumeData(userId, resumeId, cacheData)
      }
      
      logger.info(`Resume parsing completed successfully, extracted ${result.text.length} characters`)
      
      return result
    } catch (error) {
      logger.error(`Resume parsing failed: ${error}`)
      throw error
    }
  }

  public static async parseFromBlob(blobId: string, userId?: string, resumeId?: string): Promise<ParseResult> {
    try {
      logger.info(`Starting resume parsing from blob ID: ${blobId}`)
      
      // Check cache if userId and resumeId provided
      if (userId && resumeId) {
        const cachedData = await blobStorageService.getCachedResumeData(userId, resumeId)
        if (cachedData && cachedData.blobId === blobId) {
          logger.info(`Using cached resume data for blob ${blobId}`)
          return {
            text: cachedData.parsedText,
            structuredData: cachedData.structuredData,
            fileType: cachedData.fileType,
            blobId: cachedData.blobId
          }
        }
      }
      
      const buffer = await blobStorageService.getBlob(blobId)
      const fileType = this.detectFileType(buffer)
      logger.info(`Detected file type: ${fileType}`)
      
      let content: string | Buffer
      
      if (fileType === 'pdf') {
        content = await this.parsePDFText(buffer)
      } else {
        content = buffer
      }
      
      const { text, structuredData } = await this.parseWithClaude(content, fileType)
      
      const result: ParseResult = {
        text: text.replace(/\s+/g, ' ').trim(),
        structuredData,
        fileType,
        blobId
      }
      
      // Cache the parsed data if userId and resumeId provided
      if (userId && resumeId) {
        const cacheData: CachedResumeData = {
          parsedText: result.text,
          structuredData: result.structuredData,
          fileType: result.fileType,
          extractedAt: new Date(),
          blobId
        }
        await blobStorageService.cacheResumeData(userId, resumeId, cacheData)
      }
      
      logger.info(`Resume parsing from blob completed successfully, extracted ${result.text.length} characters`)
      
      return result
    } catch (error) {
      logger.error(`Resume parsing from blob failed: ${error}`)
      throw error
    }
  }
}