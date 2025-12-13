import Redis from 'ioredis';
import { logger } from '../utils/logger.js';

/**
 * CacheService - Centralized caching layer using Redis
 *
 * Features:
 * - Generic get/set with TTL support
 * - Pattern-based cache invalidation
 * - Namespaced keys for organization
 * - Error resilience (cache failures don't break app)
 */
export class CacheService {
  private redis: Redis;
  private enabled: boolean;

  constructor() {
    this.enabled = false;

    try {
      // Reuse Redis connection config from scheduler
      const redisUrl = process.env.REDIS_URL;

      if (redisUrl) {
        try {
          const url = new URL(redisUrl);
          this.redis = new Redis({
            host: url.hostname,
            port: parseInt(url.port || '6379', 10),
            password: url.password || undefined,
            retryStrategy: (times) => {
              const delay = Math.min(times * 50, 2000);
              return delay;
            },
            maxRetriesPerRequest: 3,
          });
        } catch (error) {
          logger.warn({ err: error }, 'Failed to parse REDIS_URL for cache, falling back to REDIS_HOST/PORT');
          this.redis = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379', 10),
            password: process.env.REDIS_PASSWORD || undefined,
            retryStrategy: (times) => {
              const delay = Math.min(times * 50, 2000);
              return delay;
            },
            maxRetriesPerRequest: 3,
          });
        }
      } else {
        this.redis = new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          password: process.env.REDIS_PASSWORD || undefined,
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
          maxRetriesPerRequest: 3,
        });
      }

      // Test connection
      this.redis.on('connect', () => {
        this.enabled = true;
        logger.info('Cache service connected to Redis');
      });

      this.redis.on('error', (err) => {
        this.enabled = false;
        logger.warn({ err }, 'Cache service Redis error (cache disabled)');
      });

    } catch (error) {
      this.enabled = false;
      logger.warn({ err: error }, 'Cache service initialization failed (cache disabled)');
      // Create a dummy redis instance to avoid null checks
      this.redis = new Redis({ lazyConnect: true });
    }
  }

  /**
   * Get a cached value by key
   * @returns Parsed object or null if not found/error
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled) return null;

    try {
      const value = await this.redis.get(key);
      if (!value) return null;

      return JSON.parse(value) as T;
    } catch (error) {
      logger.warn({ err: error, key }, 'Cache GET failed');
      return null;
    }
  }

  /**
   * Set a cached value with optional TTL
   * @param key Cache key
   * @param value Value to cache (will be JSON.stringify'd)
   * @param ttlSeconds Time to live in seconds (default: no expiration)
   */
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (!this.enabled) return;

    try {
      const serialized = JSON.stringify(value);

      if (ttlSeconds && ttlSeconds > 0) {
        await this.redis.setex(key, ttlSeconds, serialized);
      } else {
        await this.redis.set(key, serialized);
      }

      logger.debug({ key, ttl: ttlSeconds }, 'Cache SET');
    } catch (error) {
      logger.warn({ err: error, key }, 'Cache SET failed');
    }
  }

  /**
   * Invalidate all keys matching a pattern
   * @param pattern Redis pattern (e.g., "agents:*", "tools:definitions")
   */
  async invalidate(pattern: string): Promise<void> {
    if (!this.enabled) return;

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        logger.debug({ pattern, count: keys.length }, 'Cache INVALIDATE');
      }
    } catch (error) {
      logger.warn({ err: error, pattern }, 'Cache INVALIDATE failed');
    }
  }

  /**
   * Delete a specific key
   */
  async delete(key: string): Promise<void> {
    if (!this.enabled) return;

    try {
      await this.redis.del(key);
      logger.debug({ key }, 'Cache DELETE');
    } catch (error) {
      logger.warn({ err: error, key }, 'Cache DELETE failed');
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    if (!this.enabled) return;

    try {
      await this.redis.flushdb();
      logger.info('Cache CLEARED');
    } catch (error) {
      logger.warn({ err: error }, 'Cache CLEAR failed');
    }
  }

  /**
   * Check if cache is available
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ enabled: boolean; keyCount: number; memoryUsed?: string }> {
    if (!this.enabled) {
      return { enabled: false, keyCount: 0 };
    }

    try {
      const dbSize = await this.redis.dbsize();
      const info = await this.redis.info('memory');
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);

      return {
        enabled: true,
        keyCount: dbSize,
        memoryUsed: memoryMatch ? memoryMatch[1] : undefined,
      };
    } catch (error) {
      logger.warn({ err: error }, 'Cache STATS failed');
      return { enabled: false, keyCount: 0 };
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      logger.info('Cache service closed');
    }
  }

  // ============================================================================
  // CACHE KEY HELPERS
  // ============================================================================

  /**
   * Predefined cache key generators for consistency
   */
  static keys = {
    // Agent-related caches
    agentList: (organizationId: string, params?: string) =>
      params ? `agents:list:${organizationId}:${params}` : `agents:list:${organizationId}`,

    agentListPattern: (organizationId: string) =>
      `agents:list:${organizationId}*`,

    agentDetails: (agentId: string) =>
      `agents:details:${agentId}`,

    agentStats: (agentId: string) =>
      `agents:stats:${agentId}`,

    // Tool-related caches
    toolDefinitions: (params?: string) =>
      params ? `tools:definitions:${params}` : 'tools:definitions',

    toolDefinitionsPattern: () =>
      'tools:definitions*',

    serverTools: (serverId: string) =>
      `tools:server:${serverId}`,

    // Server-related caches
    serverList: (organizationId: string) =>
      `servers:list:${organizationId}`,

    serverHealth: (serverId: string) =>
      `servers:health:${serverId}`,

    // Organization-related caches
    orgPattern: (organizationId: string) =>
      `*:${organizationId}*`,
  };
}

// Singleton instance
let cacheServiceInstance: CacheService | null = null;

export function getCacheService(): CacheService {
  if (!cacheServiceInstance) {
    cacheServiceInstance = new CacheService();
  }
  return cacheServiceInstance;
}
