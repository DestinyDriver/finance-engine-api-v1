const Redis = require("ioredis");
const { redisUrl, redisPassword } = require("../config");
const logger = require("./logger");

let redisClient;

const createRedisClient = () => {
  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy: (times) => {
      if (times > 10) {
        return null;
      }
      return Math.min(times * 100, 3000);
    },
  });

  client.on("connect", () => logger.info("Redis connected"));
  client.on("ready", () => logger.info("Redis ready"));
  client.on("error", (error) =>
    logger.error("Redis error", { error: error.message }),
  );
  client.on("close", () => logger.warn("Redis closed"));
  client.on("reconnecting", () => logger.info("Redis reconnecting"));

  return client;
};

const getRedis = () => {
  if (!redisClient) {
    redisClient = createRedisClient();
  }
  return redisClient;
};

const closeRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
};

const cacheSet = async (key, value, ttl) => {
  const redis = getRedis();
  if (ttl) {
    await redis.setex(
      key,
      parseInt(ttl, 10),
      typeof value === "string" ? value : JSON.stringify(value),
    );
  } else {
    await redis.set(
      key,
      typeof value === "string" ? value : JSON.stringify(value),
    );
  }
};

const cacheDel = async (key) => {
  const redis = getRedis();
  await redis.del(key);
};

const cacheGetOrSet = async (key, ttl, fetchFn) => {
  const redis = getRedis();
  try {
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }
    const value = await fetchFn();
    await redis.setex(key, ttl, JSON.stringify(value));
    return value;
  } catch (error) {
    logger.error("Redis cache failed", { error: error.message, key });
    return fetchFn();
  }
};

const invalidatePattern = async (pattern) => {
  const redis = getRedis();
  const stream = redis.scanStream({ match: pattern, count: 100 });
  const keys = [];

  for await (const resultKeys of stream) {
    if (resultKeys.length) {
      keys.push(...resultKeys);
    }
  }

  if (keys.length > 0) {
    await redis.del(keys);
  }
};

module.exports = {
  redis: getRedis,
  getRedis,
  closeRedis,
  cacheSet,
  cacheDel,
  cacheGetOrSet,
  invalidatePattern,
};
