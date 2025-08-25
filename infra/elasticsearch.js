const { Client } = require('@elastic/elasticsearch');
const _ = require('lodash');
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
              dynamic_templates: [
                {
                  // All string fields in attributes become keywords (for exact filtering)
                  attribute_strings: {
                    match_mapping_type: "string",
                    path_match: "attributes.*",
                    mapping: {
                      type: "keyword"
                    }
                  }
                },
                {
                  // All numeric fields stay as numbers
                  attribute_numbers: {
                    match_mapping_type: "long",
                    path_match: "attributes.*",
                    mapping: {
                      type: "long"
                    }
                  }
                }
              ],
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
                  type: 'object',
                  dynamic: true
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

  async searchVariants(query, filters = {}, skip = 0, limit = 50, selectedFields = null) {
    const esQuery = {
      index: this.indexName,
      from: skip,
      size: limit,
      // elastic search usually return default total not more than 10,000 this `track_total_hits: true` will give the actual total hit number
      track_total_hits: true,
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

    if (!_.isNil(selectedFields)) {
      esQuery._source = selectedFields;
    }

    try {
      const response = await this.client.search(esQuery);
      return {
        hits: response.hits.hits.map(hit => ({
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