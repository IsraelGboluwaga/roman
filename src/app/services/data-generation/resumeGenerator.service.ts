import { initLogger } from '../../config/winston'
import { getResume, GetResumeResult } from '../business-logic/resume.service'
import Anthropic from '@anthropic-ai/sdk'

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
    return `You are an expert resume writer. Please optimize the following resume for the given job description.

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

Return only the optimized resume content in a clean, professional format.`
  }

  private static async formatDocument(content: string, format: string): Promise<Buffer> {
    logger.info(`Formatting document as ${format}`)
    
    // TODO: Implement document formatting
    // For now, return a simple text buffer
    // Future: Use libraries like puppeteer for PDF or officegen for DOCX
    
    throw new Error('Document formatting not yet implemented')
  }

  private static async storeTemporaryDocument(
    buffer: Buffer, 
    format: string
  ): Promise<GenerateResumeResult> {
    logger.info('Storing temporary document')
    
    // TODO: Implement temporary storage
    // Options: GridFS with TTL, S3 with expiration, temporary file system
    
    throw new Error('Temporary storage not yet implemented')
  }
}