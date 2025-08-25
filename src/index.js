const express = require('express');
const { errorHandler } = require('./common/middlewares/errors');
const ProductRouter = require('./modules/products/router/index');
const { getElasticSearchService, getPrismaClient } = require('../infra/index');

const app = express();

// initialize singleton clients to the infra
const prisma = getPrismaClient();
const elasticService = getElasticSearchService();

app.use(express.json());

// Health check endpoint
app.get('/health', async (req, res, next) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    // Check Elasticsearch connection
    await elasticService.client.ping();

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

// Add the product router
app.use(ProductRouter);

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
    await elasticService.initialize();
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
  await elasticService.client.close();
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