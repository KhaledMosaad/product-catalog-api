
const { getElasticSearchService, getPrismaClient, getRedisService } = require("../../../../infra");
const _ = require('lodash');

const ProductService = {
  /**
   * Search on products service
   * @param query String
   * @param filter Object {}
   * @param skip number
   * @param limit number
   * 
   * @returns Promise<{ totalCount: number, products:[Product] }>
   */
  async Search({ query, filter = {}, skip, limit }) {
    const esService = getElasticSearchService();
    // get search result from elastic search and extract ids from result
    const searchResult = await esService.searchVariants(query.toLowerCase(), filter, skip, limit, ["id"]);
    const variantIds = searchResult.hits.map(({ id }) => id);

    // initialize redis client to get cached values to get cached products
    const redisService = getRedisService();
    const cachedProducts = await redisService.getBatchMget(variantIds);

    // extract uncached ids and cached products
    const products = [];
    const uncachedVariantIds = [];
    for (const [key, value] of Object.entries(cachedProducts)) {
      if (_.isNil(value)) {
        uncachedVariantIds.push(key);
      } else {
        products.push(value);
      }
    }

    // if the cache hit we don't need to do any database query
    if (!_.isEmpty(uncachedVariantIds)) {
      const prisma = getPrismaClient();
      // Here we can include supplier, parent product, category
      // The result sorted with the same sent ids, we can actually sort by total_sold as it's exist in the table
      const dbProducts = await prisma.$queryRaw`
      SELECT * FROM variants 
      WHERE id = ANY(${uncachedVariantIds}::uuid[])
      ORDER BY array_position(${uncachedVariantIds}::uuid[], id)`;

      // set the postgres result in the cache
      // actually we can set all products on the cache again to reset it's ttl value, but let's keep it simple
      await redisService.setBatch(dbProducts, product => product.id, 60);

      products.push(...dbProducts);
    }

    return { total: searchResult.total, products, skip: searchResult.skip, limit: searchResult.limit };
  }
};

module.exports = ProductService;