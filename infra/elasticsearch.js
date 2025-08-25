const { Client } = require('@elastic/elasticsearch');

class ElasticsearchService {
  constructor() {
    this.client = new Client({
      node: process.env.ELASTICSEARCH_URL
    });
    this.indexName = 'product_variants';
  }

  async initialize() {
    try {
      // Check if index exists
      const indexExists = await this.client.indices.exists({
        index: this.indexName
      });

      if (!indexExists) {
        // Create index with mapping
        await this.client.indices.create({
          index: this.indexName,
          body: {
            mappings: {
              properties: {
                // No need for analysis
                id: { type: 'keyword' },
                search_text: {
                  type: 'text',
                  // The whitespace analyzer divides text into terms whenever it encounters any whitespace character
                  // Source: https://www.elastic.co/docs/reference/text-analysis/analysis-whitespace-analyzer
                  analyzer: 'whitespace'
                },
                attributes: {
                  type: 'nested',
                  dynamic: true,
                },
                total_sold: { type: 'integer' }
              }
            }
          }
        });
        console.log(`Created Elasticsearch index: ${this.indexName}`);
      }
    } catch (error) {
      console.error('Elasticsearch initialization error:', error);
      throw error;
    }
  }

  async searchVariants(query, filters = {}, skip = 0, limit = 50) {
    const esQuery = {
      index: this.indexName,
      from: skip,
      size: limit,
      query: {
        bool: {
          must: query ? [{ match: { search_text: query } }] : [],
          filter: Object.entries(filters).map(([k, v]) => ({
            term: { [`attributes.${k}`]: v }
          }))
        }
      },
      sort: [{ total_sold: 'desc' }]
    };

    try {
      const response = await this.client.search(esQuery);
      console.log(response);
      return {
        hits: response.hits.hits.map(hit => ({
          id: hit._source.id,
          score: hit._score,
          ...hit._source
        })),
        total: response.hits.total.value,
        skip,
        limit,
      };
    } catch (error) {
      console.log(error)
      throw error
    }

  }
}

module.exports = ElasticsearchService;