import Handlebars from 'handlebars'
import path from 'path'
import fs from 'fs/promises'
import { initLogger } from '../../config/winston'
import { registerHelpers } from '../../../templates/helpers/handlebars.helpers'
import { fileURLToPath } from 'url'

const logger = initLogger('template.service.ts')

export interface ResumeTemplateData {
  personalInfo: {
    name: string
    email: string
    phone?: string
    location?: string
    linkedin?: string
  }
  summary?: string
  experience: Array<{
    title: string
    company: string
    startDate: string
    endDate?: string
    description?: string
    achievements: string[]
  }>
  education: Array<{
    degree: string
    school: string
    year: string
    gpa?: string
    honors?: string
  }>
  skills: string[]
}

export class TemplateService {
  private static initialized = false
  private static templateCache = new Map<string, HandlebarsTemplateDelegate>()
  private static stylesCache = new Map<string, string>()
  private static readonly PROJECT_ROOT = path.resolve(__dirname, '../../../..')

  static async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      logger.info('Initializing template service')
      
      // Register Handlebars helpers
      registerHelpers()
      
      // Register partials
      await this.registerPartials()
      
      this.initialized = true
      logger.info('Template service initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize template service:', error)
      throw error
    }
  }

  private static async registerPartials(): Promise<void> {
    const partialsDir = path.join(this.PROJECT_ROOT, 'src/templates/resume/partials')
    
    try {
      const partialFiles = await fs.readdir(partialsDir)
      
      for (const file of partialFiles) {
        if (file.endsWith('.hbs')) {
          const partialName = path.basename(file, '.hbs')
          const partialPath = path.join(partialsDir, file)
          const partialContent = await fs.readFile(partialPath, 'utf-8')
          
          Handlebars.registerPartial(partialName, partialContent)
          logger.info(`Registered partial: ${partialName}`)
        }
      }
    } catch (error) {
      logger.error('Failed to register partials:', error)
      throw new Error('Failed to load template partials')
    }
  }

  static async compileTemplate(templateName: string, data: ResumeTemplateData): Promise<string> {
    await this.initialize()

    try {
      logger.info(`Compiling template: ${templateName}`)
      
      // Load template
      const template = await this.loadTemplate(templateName)
      
      // Load styles
      const styles = await this.loadStyles('resume')
      
      // Prepare template data with styles
      const templateData = {
        ...data,
        styles
      }
      
      // Compile template
      const html = template(templateData)
      
      logger.info('Template compiled successfully')
      return html
      
    } catch (error) {
      logger.error(`Failed to compile template ${templateName}:`, error)
      throw error
    }
  }

  private static async loadTemplate(templateName: string): Promise<HandlebarsTemplateDelegate> {
    // Check cache first
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!
    }

    try {
      const templatePath = path.join(this.PROJECT_ROOT, `src/templates/resume/${templateName}.hbs`)
      const templateContent = await fs.readFile(templatePath, 'utf-8')
      const compiled = Handlebars.compile(templateContent)
      
      // Cache the compiled template
      this.templateCache.set(templateName, compiled)
      
      return compiled
    } catch (error) {
      logger.error(`Template not found at path: ${path.join(this.PROJECT_ROOT, `src/templates/resume/${templateName}.hbs`)}`)
      throw new Error(`Template ${templateName} not found`)
    }
  }

  private static async loadStyles(styleName: string): Promise<string> {
    // Check cache first
    if (this.stylesCache.has(styleName)) {
      return this.stylesCache.get(styleName)!
    }

    try {
      const stylesPath = path.join(this.PROJECT_ROOT, `src/templates/styles/${styleName}.css`)
      const stylesContent = await fs.readFile(stylesPath, 'utf-8')
      
      // Cache the styles
      this.stylesCache.set(styleName, stylesContent)
      
      return stylesContent
    } catch (error) {
      logger.error(`Styles not found at path: ${path.join(this.PROJECT_ROOT, `src/templates/styles/${styleName}.css`)}`)
      throw new Error(`Styles ${styleName} not found`)
    }
  }

  static getAvailableTemplates(): string[] {
    return ['modern'] // Add more template names as you create them
  }

  static clearCache(): void {
    this.templateCache.clear()
    this.stylesCache.clear()
    logger.info('Template cache cleared')
  }
}