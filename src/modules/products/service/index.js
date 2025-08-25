
const { getElasticSearchService, getPrismaClient } = require("../../../../infra");

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
    const result = await esService.searchVariants(query.toLowerCase(), filter, skip, limit, ["id"]);
    const variantIds = result.hits.map(({ id }) => id);

    const prisma = getPrismaClient();
    // Here we can include supplier, parent product, category
    const products = await prisma.variant.findMany({
      where: {
        id: {
          in: variantIds,
        },
      }
    })


    return products;
  }
};

module.exports = ProductService;