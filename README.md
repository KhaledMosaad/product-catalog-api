# Product Catalog Service

A high-performance product catalog microservice with advanced search capabilities, caching, and dynamic filtering.

You can find the full design document at [System Design Doc](./docs/System-Design-Document.md)

## Features

- Full-text search with Elasticsearch
- Redis caching for improved performance
- Dynamic attribute-based filtering
- PostgreSQL database with Prisma ORM
- RESTful API with validation
- Docker containerization

## Schema Diagram

![Postgres Schema Diagram](./docs/Schema%20diagram.png)

- `products` table

  - Stores product metadata (`id`, `name`, `category_id`, `supplier_id`, `created_at`)
  - Linked to `categories` and `suppliers`

- `variants` table

  - Stores product variant details (e.g. `price`, `stock`, `sku`, `attributes`)
  - Has foreign keys: `product_id`, `category_id`, `supplier_id`
  - Contains analytics field: `total_sold`

- `categories` table

  - Holds category definitions (`id`, `name`)
  - Referenced by both `products` and `variants`

- `suppliers` table

  - Holds supplier info (`id`, `name`, `contact_email`)
  - Linked to `products` and `variants`

- **Relationships**

  - `variants` is the central table, referencing `products`, `categories`, and `suppliers`
  - `products` also references `categories` and `suppliers`

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Search Engine**: Elasticsearch 8.10
- **Cache**: Redis with ioredis
- **Validation**: Joi
- **Containerization**: Docker & Docker Compose

## Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)

## Quick Start

1. Clone the repository

```bash
git clone https://github.com/KhaledMosaad/product-catalog-api
cd product-catalog-api
```

2. Start the services

```bash
docker-compose up --build
```

3. The API will be available at `http://localhost:3000`

## Data Setup

Run the data creation script to populate the database:

```bash
node create-script.js
```

This script will:

- Generate dummy product data
- Sync data with Elasticsearch index
- Set up the search functionality
- Uncomment the wanted function and run it with `node ./create-script.js`

## API Endpoints

### Search Products

```
GET /products/search
```

**Query Parameters:**

- `query` (string): Text search query
- `filter[key]` (string): Dynamic filtering by attributes
- `skip` (number): Pagination offset (default: 0)
- `limit` (number): Results per page (default: 50)

**Example:**

```bash
GET /products/search?query=laptop&filter[brand]=Apple&filter[color]=silver&skip=0&limit=20
```

**Response:**

```json
{
  "total": 1250,
  "products": [...],
  "skip": 0,
  "limit": 20
}
```

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `ELASTICSEARCH_URL`: Elasticsearch cluster URL
- `REDIS_HOST`: Redis server host
- `REDIS_PORT`: Redis server port

## Project Structure

```
src/
├── modules/products/      # Product module
│   ├── controller/        # Request handlers
│   ├── router/           # Route definitions
│   ├── service/          # Business logic
│   └── validation/       # Input validation
├── common/middlewares/   # Shared middleware
└── index.js             # Application entry point

infra/                   # Infrastructure services
├── elasticsearch.js     # Elasticsearch client
├── redis.js            # Redis client
└── index.js            # Service exports

prisma/                 # Database schema & migrations
```

## Development

### Local Development

```bash
npm install
npm run dev
```

### Database Operations

```bash
npm run db:migrate    # Run migrations
npm run db:generate   # Generate Prisma client
npm run db:reset      # Reset database
```

## Performance Features

- **Elasticsearch**: Fast full-text search across millions of products
- **Redis Caching**: Automatic caching of frequently accessed products
- **Optimized Queries**: Database queries maintain search result ordering
- **Connection Pooling**: Efficient database connection management
