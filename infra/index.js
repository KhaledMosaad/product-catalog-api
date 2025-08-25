const { PrismaClient } = require("@prisma/client");
const ElasticsearchService = require("./elasticsearch");
const RedisService = require("./redis.js");
const _ = require('lodash')

let service;
let prismaClient;
let redisService;

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

// Return a singleton Redis service
const getRedisService = () => {
  if (redisService) {
    return redisService;
  }

  redisService = new RedisService();
  return redisService;
};

module.exports = {
  getElasticSearchService,
  getPrismaClient,
  getRedisService
}