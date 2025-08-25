const express = require('express');
const { PrismaClient } = require('@prisma/client');
const ElasticsearchService = require('../services/elasticsearch');
const { errorHandler } = require('./common/middlewares/errors');
const { validate } = require('./common/middlewares/validation');
const { healthValidation } = require('../test')

const app = express();
const prisma = new PrismaClient();
const elasticsearchService = new ElasticsearchService();

app.use(express.json());

// Health check endpoint
app.get('/health', validate(healthValidation), async (req, res, next) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    // Check Elasticsearch connection
    await elasticsearchService.client.ping();

    res.status(200).json({
      status: 'ok',
      service: 'product-catalog-service',
      database: 'connected',
      elasticsearch: 'connected'
    });
  } catch (error) {
    next(error);
  }
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Initialize and start server
async function startServer() {
  try {
    console.log('Initializing Elasticsearch...');
    await elasticsearchService.initialize();
    console.log('Elasticsearch initialized successfully');

    const port = process.env.SERVER_PORT || 3000;
    app.listen(port, () => {
      console.log(`listening on port ${port}`);
      console.log(`Health check: http://localhost:${port}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  await elasticsearchService.client.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  await elasticsearchService.client.close();
  process.exit(0);
});

// Start the server
startServer(); 