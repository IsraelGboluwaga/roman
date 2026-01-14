const express = require('express');
const { setupSwagger } = require('./dist/app/config/swagger');

const app = express();
const PORT = 3001;

// Basic middleware
app.use(express.json());

// Setup Swagger documentation  
try {
  console.log('Setting up Swagger documentation...');
  setupSwagger(app);
  console.log('✅ Swagger setup successful');
} catch (error) {
  console.error('❌ Swagger setup failed:', error.message);
  process.exit(1);
}

// Basic test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Documentation test server running', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`📚 Documentation test server running on http://localhost:${PORT}`);
  console.log(`📖 API Documentation: http://localhost:${PORT}/docs`);
  console.log(`📄 OpenAPI Spec: http://localhost:${PORT}/docs.json`);
});