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
}

module.exports = ElasticsearchService; 