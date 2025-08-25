const Redis = require('ioredis');

class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  connect() {
    if (this.isConnected) {
      return this.client;
    }

    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: process.env.REDIS_DB || 0,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
    });

    this.client.on('connect', () => {
      console.log('Redis connected');
      this.isConnected = true;
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      console.log('Redis connection closed');
      this.isConnected = false;
    });

    return this.client;
  }

  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
      this.isConnected = false;
    }
  }

  /**
   * Set multiple key-value pairs in batch using pipeline
   * @param {Array} keyValuePairs 
   * @param {Function} getKeyClosure
   * @param {number} ttl in seconds
   * @returns {Promise<Array>}
   */
  async setBatch(keyValuePairs, getKeyClosure, ttl = null) {
    if (!this.client) {
      this.connect();
    }

    const pipeline = this.client.pipeline();

    if (Array.isArray(keyValuePairs)) {
      // Handle array of [key, value] pairs
      for (const value of keyValuePairs) {
        const key = getKeyClosure(value);
        const serializedValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        if (ttl) {
          pipeline.setex(key, ttl, serializedValue);
        } else {
          pipeline.set(key, serializedValue);
        }
      }
    }

    const result = await pipeline.exec();
    return result;
  }

  /**
   * Get multiple values using MGET
   * @param {Array} keys 
   * @param {boolean} parseJson
   * @returns {Promise<Object>}
   */
  async getBatchMget(keys) {
    if (!this.client) {
      this.connect();
    }

    if (keys.length === 0) {
      return {};
    }

    const values = await this.client.mget(...keys);
    const result = {};

    keys.forEach((key, index) => {
      const value = values[index];
      if (value !== null) {
        try {
          result[key] = JSON.parse(value);
        } catch (e) {
          // If JSON parsing fails, return the raw value
          result[key] = value;
        }
      } else {
        // To get the values that are not cached and get them from main db
        result[key] = null;
      }
    });

    return result;
  }

  /**
   * Check if key exists
   * @param {string} key 
   * @returns {Promise<boolean>}
   */
  async exists(key) {
    if (!this.client) {
      this.connect();
    }

    return (await this.client.exists(key)) === 1;
  }

  /**
   * Get Redis client instance
   * @returns {Redis}
   */
  getClient() {
    if (!this.client) {
      this.connect();
    }
    return this.client;
  }
}

module.exports = RedisService; 