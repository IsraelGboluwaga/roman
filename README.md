# Roman AI Resume Generator

An AI-powered resume generator that creates tailored resumes based on uploaded resumes and job descriptions using advanced document processing and artificial intelligence.

## 🚀 Features

### Resume Generation
- **Multi-format Support**: Upload and parse PDF, DOCX, DOC files, and images
- **AI-Powered Tailoring**: Generate customized resumes using Anthropic Claude
- **Job Description Analysis**: Parse job requirements to optimize resume content
- **Template System**: Professional HTML templates with Handlebars
- **Document Generation**: Export to PDF and DOCX formats
- **Secure Storage**: MongoDB GridFS with Redis caching

### AI Resume Optimization
- **Smart Content Matching**: Match resume content to job requirements
- **Resume Analysis**: AI-powered resume parsing and content extraction
- **Tailored Content**: Generate job-specific resume versions

### Security & Performance
- **JWT Authentication**: Secure user authentication and authorization
- **Rate Limiting**: Protection against abuse and spam
- **Input Sanitization**: XSS protection and data validation
- **Redis Caching**: Fast resume data retrieval
- **Comprehensive Logging**: Winston-based structured logging

### Chrome Extension
- **Browser Integration**: Seamless integration with job posting websites
- **Real-time Processing**: Extract job requirements and generate tailored resumes
- **Popup Interface**: Clean, intuitive user interface

## 🛠 Tech Stack

- **Backend**: Node.js, Express.js, TypeScript
- **Database**: MongoDB with GridFS for file storage
- **Caching**: Redis for performance optimization
- **AI**: Anthropic Claude for resume generation and tailoring
- **Document Processing**: 
  - Puppeteer (PDF generation)
  - html-docx-js (DOCX generation)
  - mammoth (DOC/DOCX parsing)
  - pdf-parse (PDF parsing)
- **Templating**: Handlebars.js
- **Authentication**: JWT with bcryptjs
- **Testing**: Jest with comprehensive test coverage

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd roman
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Configure the following environment variables:
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # Database
   MONGODB_URI=mongodb://localhost:27017/roman-ai
   REDIS_URL=redis://localhost:6379

   # AI Services
   ANTHROPIC_API_KEY=your_anthropic_api_key

   # Authentication
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRES_IN=7d

   # File Storage
   MAX_FILE_SIZE=10MB
   RESUME_CACHE_TTL_HOURS=72
   ```

4. **Start development server**
   ```bash
   yarn dev
   ```

## 🚀 Usage

### API Endpoints

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

#### Resume Management
- `GET /api/resumes` - List user resumes
- `POST /api/resumes` - Upload new resume
- `GET /api/resumes/:id` - Get specific resume
- `PUT /api/resumes/:id` - Update resume
- `DELETE /api/resumes/:id` - Delete resume

#### AI Generation
- `POST /api/generation/optimize` - AI-powered resume generation
- `POST /api/generation/download` - Generate downloadable documents

#### User Management
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

### Document Processing

The system supports multiple input formats:

```typescript
// Supported input formats
type SupportedInputFormats = 'pdf' | 'docx' | 'doc' | 'image'

// Supported output formats
type SupportedOutputFormats = 'pdf' | 'docx'
```

### Template System

Create custom resume templates using Handlebars:

```html
<!-- src/templates/resume/modern.hbs -->
<!DOCTYPE html>
<html>
<head>
    <title>{{personalInfo.name}} - Resume</title>
    <style>{{{styles}}}</style>
</head>
<body>
    <div class="resume-container">
        {{> header personalInfo}}
        {{#if experience}}
        <section class="experience">
            {{#each experience}}
                {{> experience-item this}}
            {{/each}}
        </section>
        {{/if}}
    </div>
</body>
</html>
```

## 🧪 Testing

Run the test suite:

```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test:watch

# Run tests with coverage
yarn test:coverage
```

Current test coverage includes:
- Resume parsing and generation services
- Authentication and authorization
- API endpoints and middleware
- Document generation and templating
- Storage and caching services

## 🔧 Development

### Available Scripts

- `yarn dev` - Start development server
- `yarn build` - Build for production
- `yarn test` - Run test suite
- `yarn lint` - Run ESLint
- `yarn lint:fix` - Fix ESLint issues
- `yarn format` - Format code with Prettier
- `yarn typecheck` - Run TypeScript compiler

### Project Structure

```
src/
├── app/
│   ├── api/                    # Express.js API
│   │   ├── controllers/        # Route controllers
│   │   ├── middleware/         # Custom middleware
│   │   └── routes/            # API routes
│   ├── chrome-extension/       # Chrome extension files
│   ├── config/                # Configuration files
│   ├── models/                # MongoDB models
│   ├── services/              # Business logic services
│   │   ├── business-logic/    # Core business services
│   │   ├── data-extraction/   # Document parsing
│   │   ├── data-generation/   # AI generation
│   │   ├── document-generation/ # PDF/DOCX creation
│   │   ├── storage/           # File storage services
│   │   └── templating/        # Template processing
│   └── utils/                 # Utility functions
├── templates/                 # Handlebars templates
│   ├── resume/               # Resume templates
│   └── styles/               # CSS styles
└── testSetup.ts              # Jest configuration
```

## 🚀 Deployment

### Production Build

1. **Build the application**
   ```bash
   yarn build
   ```

2. **Set production environment variables**
   ```bash
   NODE_ENV=production
   ```

3. **Start the production server**
   ```bash
   node dist/app/server.js
   ```

### Docker Deployment

The application is optimized for containerized deployment with proper Puppeteer configuration for headless Chrome in production environments.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔒 Security

- Input validation and sanitization
- Rate limiting and DDoS protection
- Secure file upload handling
- JWT token management
- MongoDB injection prevention
- XSS protection middleware

## 📚 API Documentation

For detailed API documentation, start the development server and visit the API endpoints. The application includes comprehensive error handling and validation for all endpoints.

## ⚡ Performance

- Redis caching for frequently accessed data
- Optimized document processing pipelines
- Lazy loading and code splitting
- Production-ready Puppeteer configuration
- Efficient file storage with GridFS