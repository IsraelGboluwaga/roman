import { initLogger } from '../../config/winston'
import { getResume, GetResumeResult } from '../business-logic/resume.service'
import Anthropic from '@anthropic-ai/sdk'
import { TemplateService, ResumeTemplateData } from '../templating/template.service'
import { DocumentGenerator } from '../document-generation/documentGenerator.service'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import fs from 'fs/promises'

const logger = initLogger('resumeGenerator.service.ts')

export interface GenerateResumeInput {
  resumeId: string
  jobDescription: string
  format?: 'pdf' | 'docx'
}

export interface GenerateResumeResult {
  downloadUrl: string
  expiresAt: Date
  format: string
}

export class ResumeGenerator {
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

  static async generateResume(input: GenerateResumeInput): Promise<GenerateResumeResult> {
    try {
      logger.info(`Starting resume generation for resumeId: ${input.resumeId}`)

      // 1. Fetch the original resume with parsed data
      const resume = await this.getResumeData(input.resumeId)

      // 2. Generate optimized resume content using AI
      const optimizedContent = await this.generateOptimizedContent(
        resume, 
        input.jobDescription
      )

      // 3. Format the content into requested document format
      const documentBuffer = await this.formatDocument(
        optimizedContent, 
        input.format || 'pdf'
      )

      // 4. Store temporarily and return download URL
      const result = await this.storeTemporaryDocument(
        documentBuffer, 
        input.format || 'pdf'
      )

      logger.info(`Resume generation completed successfully`)
      return result

    } catch (error) {
      logger.error(`Error generating resume: ${error}`)
      throw error
    }
  }

  private static async getResumeData(resumeId: string): Promise<GetResumeResult> {
    logger.info(`Fetching resume data for ID: ${resumeId}`)
    
    const resume = await getResume(resumeId)
    
    if (!resume.parsedText || !resume.structuredData) {
      throw new Error('Resume does not have parsed data. Please re-upload the resume.')
    }

    return resume
  }

  private static async generateOptimizedContent(
    resume: GetResumeResult, 
    jobDescription: string
  ): Promise<string> {
    logger.info('Generating optimized resume content with AI')

    const prompt = this.buildOptimizationPrompt(resume, jobDescription)
    
    const anthropic = this.getAnthropicClient()
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from AI')
    }

    return content.text
  }

  private static buildOptimizationPrompt(
    resume: GetResumeResult, 
    jobDescription: string
  ): string {
    return `You are an expert resume writer. Please optimize the following resume for the given job description and return the result as a JSON object.

ORIGINAL RESUME:
${resume.parsedText}

STRUCTURED DATA:
${JSON.stringify(resume.structuredData, null, 2)}

JOB DESCRIPTION:
${jobDescription}

Please create an optimized resume that:
1. Highlights relevant experience and skills for this specific role
2. Uses keywords from the job description naturally
3. Maintains factual accuracy (do not fabricate experience)
4. Improves formatting and clarity
5. Follows ATS-friendly formatting

Return ONLY a valid JSON object with this exact structure:
{
  "personalInfo": {
    "name": "Full Name",
    "email": "email@example.com",
    "phone": "phone number",
    "location": "City, State",
    "linkedin": "linkedin URL (optional)"
  },
  "summary": "Professional summary paragraph",
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "startDate": "2023-01-01",
      "endDate": "2024-01-01",
      "description": "Brief job description",
      "achievements": ["Achievement 1", "Achievement 2"]
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "school": "School Name",
      "year": "2023",
      "gpa": "3.8/4.0",
      "honors": "Magna Cum Laude"
    }
  ],
  "skills": ["Skill 1", "Skill 2", "Skill 3"]
}`
  }

  private static async formatDocument(content: string, format: string): Promise<Buffer> {
    logger.info(`Formatting document as ${format}`)
    
    try {
      // Extract and parse JSON from AI response (handles markdown wrapping)
      const resumeData: ResumeTemplateData = this.extractJsonFromAIResponse(content)
      
      // Compile HTML template
      const html = await TemplateService.compileTemplate('modern', resumeData)
      
      // Generate document based on format
      const buffer = await DocumentGenerator.generateDocument(html, format as 'pdf' | 'docx')
      
      logger.info(`Document formatted successfully as ${format}`)
      return buffer
      
    } catch (error) {
      logger.error(`Document formatting failed: ${error}`)
      throw error
    }
  }

  private static extractJsonFromAIResponse(content: string): ResumeTemplateData {
    try {
      // First try direct JSON parse
      return JSON.parse(content.trim())
    } catch (error) {
      logger.info('Direct JSON parse failed, attempting to extract from markdown')
      
      // Extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i)
      
      if (jsonMatch && jsonMatch[1]) {
        try {
          return JSON.parse(jsonMatch[1].trim())
        } catch (parseError) {
          logger.error('Failed to parse extracted JSON from markdown:', parseError)
        }
      }
      
      // Try to find JSON object without code blocks
      const jsonObjectMatch = content.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        try {
          return JSON.parse(jsonObjectMatch[0].trim())
        } catch (parseError) {
          logger.error('Failed to parse extracted JSON object:', parseError)
        }
      }
      
      logger.error('No valid JSON found in AI response:', content.substring(0, 200))
      throw new Error('AI response does not contain valid JSON. Please try again.')
    }
  }

  private static async storeTemporaryDocument(
    buffer: Buffer, 
    format: string
  ): Promise<GenerateResumeResult> {
    logger.info('Storing document to cloud storage')
    
    try {
      // Generate unique filename
      const fileId = uuidv4()
      const filename = `resume_${fileId}.${format}`
      
      // Set expiration (1 hour from now)
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
      
      // TODO: Implement actual cloud storage (S3, GCS, Azure Blob)
      // For now, simulate cloud storage with placeholder URL
      const cloudStorageUrl = await this.uploadToCloudStorage(buffer, filename, expiresAt)
      
      logger.info(`Document stored in cloud storage: ${filename}`)
      
      return {
        downloadUrl: cloudStorageUrl,
        expiresAt,
        format
      }
      
    } catch (error) {
      logger.error(`Cloud storage failed: ${error}`)
      throw new Error(`Failed to store document: ${error}`)
    }
  }

  private static async uploadToCloudStorage(buffer: Buffer, filename: string, expiresAt: Date): Promise<string> {
    // TODO: Replace with actual cloud storage implementation
    // Example implementations:
    
    // AWS S3:
    // const s3 = new AWS.S3()
    // await s3.upload({
    //   Bucket: 'your-resume-bucket',
    //   Key: `generated/${filename}`,
    //   Body: buffer,
    //   ContentType: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    //   Expires: expiresAt
    // }).promise()
    // return s3.getSignedUrl('getObject', { Bucket: 'your-resume-bucket', Key: `generated/${filename}`, Expires: 3600 })
    
    // Google Cloud Storage:
    // const storage = new Storage()
    // const bucket = storage.bucket('your-resume-bucket')
    // const file = bucket.file(`generated/${filename}`)
    // await file.save(buffer)
    // const [signedUrl] = await file.getSignedUrl({ expires: expiresAt, action: 'read' })
    // return signedUrl
    
    // For now, return a placeholder cloud storage URL
    const baseUrl = process.env.CLOUD_STORAGE_BASE_URL || 'https://storage.yourapp.com'
    const signedUrl = `${baseUrl}/generated/${filename}?expires=${expiresAt.getTime()}&signature=placeholder_signature`
    
    logger.info(`Generated placeholder cloud storage URL: ${signedUrl}`)
    return signedUrl
  }

  // Note: Cloud storage cleanup is handled by the storage provider's TTL/expiration policies
  // No manual cleanup needed for pre-signed URLs - they automatically expire
}