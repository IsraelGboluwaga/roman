import swaggerJsdoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'
import { Express } from 'express'

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Roman AI Resume Generator API',
      version: '1.0.0',
      description: 'AI-powered resume generator that creates tailored resumes based on uploaded resumes and job descriptions',
      contact: {
        name: 'Roman AI Support',
        email: 'support@roman-ai.com'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' ? 'https://api.roman-ai.com' : 'http://localhost:3000',
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Error message'
            },
            status: {
              type: 'integer',
              description: 'HTTP status code'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Error timestamp'
            }
          },
          required: ['message', 'status']
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'User ID'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            name: {
              type: 'string',
              description: 'User full name'
            },
            created: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation date'
            }
          },
          required: ['id', 'email', 'name']
        },
        Resume: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Resume ID'
            },
            userId: {
              type: 'string',
              description: 'Owner user ID'
            },
            title: {
              type: 'string',
              description: 'Resume title'
            },
            fileUrl: {
              type: 'string',
              format: 'uri',
              description: 'Resume file download URL'
            },
            blobId: {
              type: 'string',
              description: 'Internal blob storage ID'
            },
            active: {
              type: 'boolean',
              description: 'Whether this is the user\'s active resume'
            },
            created: {
              type: 'string',
              format: 'date-time',
              description: 'Upload date'
            },
            modified: {
              type: 'string',
              format: 'date-time',
              description: 'Last modification date'
            }
          },
          required: ['id', 'userId', 'title', 'active']
        },
        ResumeContext: {
          type: 'object',
          properties: {
            parsedText: {
              type: 'string',
              description: 'Extracted text content from resume'
            },
            structuredData: {
              type: 'object',
              description: 'Parsed resume data in structured format',
              additionalProperties: true
            },
            fileType: {
              type: 'string',
              enum: ['pdf', 'docx', 'doc', 'image'],
              description: 'Original file format'
            },
            blobId: {
              type: 'string',
              description: 'Storage blob identifier'
            }
          },
          required: ['parsedText', 'structuredData', 'fileType', 'blobId']
        },
        OptimizedResume: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Generated resume ID'
            },
            originalResumeId: {
              type: 'string',
              description: 'Source resume ID'
            },
            userId: {
              type: 'string',
              description: 'Owner user ID'
            },
            jobDescription: {
              type: 'string',
              description: 'Job description used for optimization'
            },
            optimizedContent: {
              type: 'object',
              description: 'AI-optimized resume content',
              additionalProperties: true
            },
            downloadUrl: {
              type: 'string',
              format: 'uri',
              description: 'Download URL for generated document'
            },
            format: {
              type: 'string',
              enum: ['pdf', 'docx'],
              description: 'Output document format'
            },
            created: {
              type: 'string',
              format: 'date-time',
              description: 'Generation timestamp'
            }
          },
          required: ['id', 'originalResumeId', 'userId', 'optimizedContent', 'downloadUrl', 'format']
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and session management'
      },
      {
        name: 'User Management',
        description: 'User profile and account operations'
      },
      {
        name: 'Resume Management',
        description: 'Upload, retrieve, and manage resume files'
      },
      {
        name: 'AI Generation',
        description: 'AI-powered resume optimization and document generation'
      }
    ]
  },
  apis: [
    './src/app/api/routes/*.ts',
    './src/app/api/controllers/*.ts'
  ]
}

const specs = swaggerJsdoc(options)

export const setupSwagger = (app: Express): void => {
  // Serve swagger UI assets and setup
  app.use('/docs', swaggerUi.serve as any, swaggerUi.setup(specs, {
    explorer: true,
    swaggerOptions: {
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true
    },
    customSiteTitle: 'Roman AI API Documentation',
    customfavIcon: '/favicon.ico',
    customCss: `
      .swagger-ui .topbar { background-color: #2c3e50; }
      .swagger-ui .topbar .download-url-wrapper .select-label { color: #fff; }
      .swagger-ui .topbar .download-url-wrapper input[type="text"] { border: 2px solid #34495e; }
    `
  }) as any)

  // JSON endpoint for API spec
  app.get('/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.send(specs)
  })
}

export { specs as swaggerSpecs }