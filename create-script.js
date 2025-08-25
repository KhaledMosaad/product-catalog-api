
const { getElasticSearchService, getPrismaClient } = require('./infra/index');

const prisma = getPrismaClient();
const elasticService = getElasticSearchService();

const createMockData = async () => {
  console.log('Starting data creation process...');

  try {
    // Initialize Elasticsearch index
    console.log('Initializing Elasticsearch...');
    await elasticService.initialize();

    // 1. Create Suppliers (100 suppliers)
    console.log('Creating suppliers...');
    const suppliersData = [];
    for (let i = 1; i <= 100; i++) {
      suppliersData.push({
        name: `Supplier ${i}`,
        contactEmail: `supplier${i}@example.com`
      });
    }

    const suppliers = await prisma.supplier.createManyAndReturn({
      data: suppliersData
    });
    console.log(`Created ${suppliers.length} suppliers`);

    // 2. Create Categories (50 categories)
    console.log('Creating categories...');
    const categoriesData = [];
    for (let i = 1; i <= 50; i++) {
      categoriesData.push({
        name: `Category ${i}`
      });
    }

    const categories = await prisma.category.createManyAndReturn({
      data: categoriesData
    });
    console.log(`Created ${categories.length} categories`);

    // 3. Create Products (10,000 products)
    console.log('Creating products...');
    const PRODUCTS_COUNT = 10000;
    const BATCH_SIZE = 1000;

    const allProducts = [];
    for (let batch = 0; batch < PRODUCTS_COUNT / BATCH_SIZE; batch++) {
      const productsData = [];

      for (let i = 1; i <= BATCH_SIZE; i++) {
        const productIndex = batch * BATCH_SIZE + i;
        const supplierIndex = Math.floor(Math.random() * suppliers.length);
        const categoryIndex = Math.floor(Math.random() * categories.length);

        productsData.push({
          name: `Product ${productIndex}`,
          supplierId: suppliers[supplierIndex].id,
          categoryId: categories[categoryIndex].id
        });
      }

      const batchProducts = await prisma.product.createManyAndReturn({
        data: productsData
      });

      allProducts.push(...batchProducts);
      console.log(`Created products batch ${batch + 1}/${PRODUCTS_COUNT / BATCH_SIZE} (${allProducts.length} total)`);
    }

    // 4. Create Variants (1,000,000 variants)
    console.log('Creating variants...');
    const VARIANTS_COUNT = 1000000;
    const VARIANT_BATCH_SIZE = 5000;
    const totalBatches = Math.ceil(VARIANTS_COUNT / VARIANT_BATCH_SIZE);

    let variantCounter = 1;
    const elasticBatchSize = 1000;
    let elasticBatch = [];

    for (let batch = 0; batch < totalBatches; batch++) {
      const variantsData = [];
      const currentBatchSize = Math.min(VARIANT_BATCH_SIZE, VARIANTS_COUNT - batch * VARIANT_BATCH_SIZE);

      for (let i = 0; i < currentBatchSize; i++) {
        const productIndex = Math.floor(Math.random() * allProducts.length);
        const product = allProducts[productIndex];

        // Generate random attributes
        const attributes = {
          color: ['Red', 'Blue', 'Green', 'Yellow', 'Black', 'White'][Math.floor(Math.random() * 6)],
          size: ['XS', 'S', 'M', 'L', 'XL', 'XXL'][Math.floor(Math.random() * 6)],
          material: ['Cotton', 'Polyester', 'Wool', 'Silk', 'Denim'][Math.floor(Math.random() * 5)]
        };

        variantsData.push({
          productId: product.id,
          supplierId: product.supplierId,
          categoryId: product.categoryId,
          attributes: attributes,
          price: parseFloat((Math.random() * 1000 + 10).toFixed(2)), // Random price between $10-$1010
          stock: Math.floor(Math.random() * 1000), // Random stock 0-999
          sku: `SKU-${variantCounter.toString().padStart(7, '0')}`,
          totalSold: Math.floor(Math.random() * 100) // Random sales 0-99
        });

        variantCounter++;
      }

      // Insert variants batch
      const variants = await prisma.variant.createManyAndReturn({
        data: variantsData
      });

      // Prepare for Elasticsearch indexing
      for (const variant of variants) {
        const esDoc = {
          id: variant.id,
          search_text: `${allProducts.find(p => p.id === variant.productId)?.name} ${variant.attributes.color} ${variant.attributes.size} ${variant.attributes.material}`.toLowerCase(),
          attributes: variant.attributes,
          total_sold: variant.totalSold
        };

        elasticBatch.push(
          { index: { _index: 'product_variants', _id: variant.id } },
          esDoc
        );

        // Index to Elasticsearch in batches
        if (elasticBatch.length >= elasticBatchSize * 2) { // *2 because each doc has 2 entries (action + doc)
          await elasticService.client.bulk({
            body: elasticBatch
          });
          elasticBatch = [];
        }
      }

      console.log(`Created variants batch ${batch + 1}/${totalBatches} (${Math.min((batch + 1) * VARIANT_BATCH_SIZE, VARIANTS_COUNT)} total)`);
    }

    // Index remaining documents to Elasticsearch
    if (elasticBatch.length > 0) {
      await elasticService.client.bulk({
        body: elasticBatch
      });
    }

    console.log('Data creation completed successfully!');
    console.log(`Created:`);
    console.log(`- ${suppliers.length} suppliers`);
    console.log(`- ${categories.length} categories`);
    console.log(`- ${allProducts.length} products`);
    console.log(`- ${VARIANTS_COUNT} variants`);
    console.log(`- All variants synced to Elasticsearch`);

  } catch (error) {
    console.error('Error creating data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
};

// createMockData()
//   .then(() => {
//     console.log('Script execution completed');
//     process.exit(0);
//   })
//   .catch((error) => {
//     console.error('Script failed:', error);
//     process.exit(1);
//   });


const syncPostgresWithElastic = async () => {
  console.log('Starting sync of PostgreSQL variants to Elasticsearch...');

  try {
    // Initialize Elasticsearch
    await elasticService.initialize();

    // Get total count first
    const totalVariants = await prisma.variant.count();
    console.log(`Found ${totalVariants} total variants to sync`);

    // Process in chunks to avoid memory issues
    const CHUNK_SIZE = 5000; // Process 5000 records at a time
    const elasticBatchSize = 1000;
    let elasticBatch = [];
    let totalProcessedCount = 0;

    // Calculate total chunks
    const totalChunks = Math.ceil(totalVariants / CHUNK_SIZE);

    for (let chunk = 0; chunk < totalChunks; chunk++) {
      console.log(`Processing chunk ${chunk + 1}/${totalChunks}...`);

      // Fetch variants chunk with their related product data
      const variants = await prisma.variant.findMany({
        skip: chunk * CHUNK_SIZE,
        take: CHUNK_SIZE,
        include: {
          product: true
        }
      });

      console.log(`Fetched ${variants.length} variants from chunk ${chunk + 1}`);

      // Process each variant in the current chunk
      for (const variant of variants) {
        // Create Elasticsearch document with same structure as existing code
        const esDoc = {
          id: variant.id,
          search_text: `${variant.product.name} ${variant.attributes.color} ${variant.attributes.size} ${variant.attributes.material}`.toLowerCase(),
          attributes: variant.attributes,
          total_sold: variant.totalSold
        };

        elasticBatch.push(
          { index: { _index: 'product_variants', _id: variant.id } },
          esDoc
        );

        // Index to Elasticsearch in batches
        if (elasticBatch.length >= elasticBatchSize * 2) { // *2 because each doc has 2 entries (action + doc)
          await elasticService.client.bulk({
            body: elasticBatch
          });
          totalProcessedCount += elasticBatchSize;
          console.log(`Synced ${totalProcessedCount}/${totalVariants} variants to Elasticsearch`);
          elasticBatch = [];
        }
      }

      console.log(`Completed chunk ${chunk + 1}/${totalChunks}`);
    }

    // Index remaining documents to Elasticsearch
    if (elasticBatch.length > 0) {
      await elasticService.client.bulk({
        body: elasticBatch
      });
      totalProcessedCount += elasticBatch.length / 2;
    }

    console.log(`Successfully synced all ${totalProcessedCount} variants to Elasticsearch`);

  } catch (error) {
    console.error('Error syncing PostgreSQL with Elasticsearch:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// syncPostgresWithElastic()
//   .then(() => {
//     console.log('Script execution completed');
//     process.exit(0);
//   })
//   .catch((error) => {
//     console.error('Script failed:', error);
//     process.exit(1);
//   });