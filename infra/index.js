const { PrismaClient } = require("@prisma/client");
const ElasticsearchService = require("./elasticsearch");
const _ = require('lodash')

let service;
let prismaClient;


// Return a singleton Elastic search service
const getElasticSearchService = () => {
  if (!_.isNil(service)) {
    return service;
  }

  service = new ElasticsearchService();
  return service;
};


// Return a singleton Prisma client
const getPrismaClient = () => {
  if (prismaClient) {
    return prismaClient;
  }

  prismaClient = new PrismaClient();
  return prismaClient;
};

module.exports = { getElasticSearchService, getPrismaClient }