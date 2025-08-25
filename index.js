const express = require('express');
const { PrismaClient } = require('@prisma/client');
const ElasticsearchService = require('./services/elasticsearch');

const app = express();
const prisma = new PrismaClient();
const elasticsearchService = new ElasticsearchService();

app.use(express.json());

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    // Check Elasticsearch connection
    await elasticsearchService.client.ping();

    res.json({
      status: 'ok',
      service: 'product-catalog-service',
      database: 'connected',
      elasticsearch: 'connected'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: String(error),
      service: 'product-catalog-service'
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

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

    const port = process.env.PORT || 3000;
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
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// Start the server
startServer(); 