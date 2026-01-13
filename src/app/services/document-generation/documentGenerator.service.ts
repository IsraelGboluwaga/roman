import puppeteer, { Browser, Page } from 'puppeteer'
import * as htmlDocx from 'html-docx-js'
import { initLogger } from '../../config/winston'

const logger = initLogger('documentGenerator.service.ts')

export interface DocumentGenerationOptions {
  format: 'pdf' | 'docx'
  filename?: string
  margins?: {
    top?: string
    bottom?: string
    left?: string
    right?: string
  }
}

export class DocumentGenerator {
  private static browserInstance: Browser | null = null

  static async generatePDF(html: string, options?: DocumentGenerationOptions): Promise<Buffer> {
    let browser: Browser | null = null
    
    try {
      logger.info('Starting PDF generation')
      
      // Launch browser
      browser = await this.getBrowserInstance()
      const page = await browser.newPage()
      
      // Set content with optimized waiting
      await page.setContent(html, { 
        waitUntil: ['domcontentloaded'], // Faster than networkidle0 for static content
        timeout: 15000 // Reduced timeout for resumes
      })
      
      // Additional optimizations for resume rendering
      await page.evaluateOnNewDocument(() => {
        // Disable animations for faster rendering
        const style = document.createElement('style')
        style.innerHTML = '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }'
        document.head.appendChild(style)
      })
      
      // Generate PDF with optimized settings
      const pdfUint8Array = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        margin: {
          top: options?.margins?.top || '20px',
          bottom: options?.margins?.bottom || '20px',
          left: options?.margins?.left || '20px',
          right: options?.margins?.right || '20px'
        },
        displayHeaderFooter: false,
        timeout: 30000
      })
      
      // Convert Uint8Array to Buffer
      const pdfBuffer = Buffer.from(pdfUint8Array)
      
      await page.close()
      
      logger.info('PDF generated successfully')
      return pdfBuffer
      
    } catch (error) {
      logger.error('PDF generation failed:', error)
      throw new Error(`PDF generation failed: ${error}`)
    }
  }

  static async generateDOCX(html: string, options?: DocumentGenerationOptions): Promise<Buffer> {
    try {
      logger.info('Starting DOCX generation')
      
      // Clean HTML for better DOCX conversion
      const cleanedHtml = this.cleanHtmlForDocx(html)
      
      // Convert HTML to DOCX
      const docxBlob = htmlDocx.asBlob(cleanedHtml, {
        orientation: 'portrait',
        margins: {
          top: 720,    // 0.5 inch in twips (1/20 of a point)
          bottom: 720,
          left: 720,
          right: 720
        }
      })
      
      // Convert blob to buffer
      let buffer: Buffer
      if (Buffer.isBuffer(docxBlob)) {
        buffer = docxBlob
      } else {
        // Handle Blob type
        const arrayBuffer = await (docxBlob as Blob).arrayBuffer()
        buffer = Buffer.from(arrayBuffer)
      }
      
      logger.info('DOCX generated successfully')
      return buffer
      
    } catch (error) {
      logger.error('DOCX generation failed:', error)
      throw new Error(`DOCX generation failed: ${error}`)
    }
  }

  static async generateDocument(html: string, format: 'pdf' | 'docx', options?: DocumentGenerationOptions): Promise<Buffer> {
    switch (format.toLowerCase()) {
      case 'pdf':
        return this.generatePDF(html, options)
      case 'docx':
        return this.generateDOCX(html, options)
      default:
        throw new Error(`Unsupported format: ${format}`)
    }
  }

  private static async getBrowserInstance(): Promise<Browser> {
    if (!this.browserInstance || !this.browserInstance.connected) {
      logger.info('Launching new Puppeteer browser instance')
      
      const isProduction = process.env.NODE_ENV === 'production'
      const isDocker = process.env.DOCKER_ENV === 'true' || process.env.IS_DOCKER === 'true'
      
      this.browserInstance = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox', 
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-images', // Faster rendering for resumes
          '--disable-javascript', // Resumes don't need JS
          '--virtual-time-budget=5000', // Timeout for slow renders
          ...(isProduction || isDocker ? [
            '--memory-pressure-off',
            '--max_old_space_size=4096',
            '--single-process', // Better for containers
            '--disable-background-networking',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-backgrounding-occluded-windows',
            '--disable-ipc-flooding-protection',
          ] : [])
        ],
        timeout: 30000,
        ...(isProduction && {
          executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome-stable'
        })
      })
      
      // Handle browser disconnection
      this.browserInstance.on('disconnected', () => {
        logger.warn('Puppeteer browser disconnected')
        this.browserInstance = null
      })
    }
    
    return this.browserInstance
  }

  private static cleanHtmlForDocx(html: string): string {
    // Clean up HTML for better DOCX conversion
    return html
      // Remove unnecessary attributes
      .replace(/\sclass="[^"]*"/g, '')
      .replace(/\sid="[^"]*"/g, '')
      // Convert CSS flexbox to table for better DOCX support
      .replace(/<div class="experience-header">/g, '<table width="100%"><tr><td>')
      .replace(/<div class="company-info">/g, '</td><td align="right">')
      .replace(/<\/div><\/div>/g, '</td></tr></table>')
      // Simplify styling
      .replace(/<style>[\s\S]*?<\/style>/gi, `
        <style>
          body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.4; }
          h1 { font-size: 18pt; font-weight: bold; text-align: center; margin-bottom: 10pt; }
          h2 { font-size: 14pt; font-weight: bold; margin-top: 15pt; margin-bottom: 8pt; border-bottom: 1px solid #ccc; }
          h3 { font-size: 12pt; font-weight: bold; margin-bottom: 5pt; }
          p { margin-bottom: 8pt; }
          ul { margin-left: 20pt; }
          li { margin-bottom: 3pt; }
          .contact-info { text-align: center; margin-bottom: 15pt; }
          table { width: 100%; margin-bottom: 10pt; }
          td { vertical-align: top; }
        </style>
      `)
  }

  static async cleanup(): Promise<void> {
    if (this.browserInstance) {
      try {
        await this.browserInstance.close()
        this.browserInstance = null
        logger.info('Puppeteer browser closed')
      } catch (error) {
        logger.error('Error closing browser:', error)
      }
    }
  }

  // Graceful shutdown
  static setupGracefulShutdown(): void {
    process.on('SIGTERM', async () => {
      await this.cleanup()
      process.exit(0)
    })

    process.on('SIGINT', async () => {
      await this.cleanup()
      process.exit(0)
    })
  }
}