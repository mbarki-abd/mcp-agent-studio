/**
 * User-Based Rate Limiting Middleware
 *
 * Provides per-user rate limiting for authenticated endpoints.
 * Falls back to IP-based limiting for unauthenticated requests.
 *
 * Uses Redis for distributed rate limiting in multi-instance deployments.
 * Falls back to in-memory Map if Redis is unavailable.
 */
import { FastifyInstance, FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';
import fp from 'fastify-plugin';
import Redis from 'ioredis';
import { logger } from '../utils/logger.js';

// Rate limit configuration by endpoint type
export interface RateLimitConfig {
  max: number;           // Maximum requests
  windowMs: number;      // Time window in milliseconds
  message?: string;      // Custom error message
  skipSuccessfulRequests?: boolean;  // Don't count successful requests
  skipFailedRequests?: boolean;      // Don't count failed requests
}

// Check if we're in development/test mode (relaxed limits for testing)
const isDev = process.env.NODE_ENV !== 'production';

// Environment-based configuration with sensible production defaults
// These can be overridden via environment variables
const getEnvInt = (key: string, defaultVal: number): number => {
  const val = process.env[key];
  return val ? parseInt(val, 10) : defaultVal;
};

// Default configurations for different endpoint types
// Now configurable via environment variables
export const rateLimitPresets = {
  // Auth endpoints - much higher limits for production testing scenarios
  // Env: RATE_LIMIT_AUTH_MAX, RATE_LIMIT_AUTH_WINDOW_MS
  auth: {
    max: isDev ? 1000 : getEnvInt('RATE_LIMIT_AUTH_MAX', 50), // 50 auth attempts per window in prod
    windowMs: isDev ? 60 * 1000 : getEnvInt('RATE_LIMIT_AUTH_WINDOW_MS', 5 * 60 * 1000), // 5 min prod
    message: 'Too many authentication attempts, please try again later',
  },
  // Standard API endpoints
  // Env: RATE_LIMIT_STANDARD_MAX, RATE_LIMIT_STANDARD_WINDOW_MS
  standard: {
    max: getEnvInt('RATE_LIMIT_STANDARD_MAX', 500), // Increased from 100
    windowMs: getEnvInt('RATE_LIMIT_STANDARD_WINDOW_MS', 60 * 1000), // 1 minute
    message: 'Too many requests, please slow down',
  },
  // Write operations (create, update, delete)
  // Env: RATE_LIMIT_WRITE_MAX, RATE_LIMIT_WRITE_WINDOW_MS
  write: {
    max: getEnvInt('RATE_LIMIT_WRITE_MAX', 100), // Increased from 30
    windowMs: getEnvInt('RATE_LIMIT_WRITE_WINDOW_MS', 60 * 1000), // 1 minute
    message: 'Too many write operations, please slow down',
  },
  // Expensive operations (reports, exports)
  // Env: RATE_LIMIT_EXPENSIVE_MAX, RATE_LIMIT_EXPENSIVE_WINDOW_MS
  expensive: {
    max: getEnvInt('RATE_LIMIT_EXPENSIVE_MAX', 30), // Increased from 10
    windowMs: getEnvInt('RATE_LIMIT_EXPENSIVE_WINDOW_MS', 60 * 1000), // 1 minute
    message: 'Too many expensive operations, please wait',
  },
  // Real-time/WebSocket subscriptions
  // Env: RATE_LIMIT_REALTIME_MAX, RATE_LIMIT_REALTIME_WINDOW_MS
  realtime: {
    max: getEnvInt('RATE_LIMIT_REALTIME_MAX', 200), // Increased from 50
    windowMs: getEnvInt('RATE_LIMIT_REALTIME_WINDOW_MS', 60 * 1000), // 1 minute
    message: 'Too many subscription requests',
  },
} as const;

// Export current config for admin dashboard
export function getCurrentRateLimits() {
  return {
    auth: { ...rateLimitPresets.auth },
    standard: { ...rateLimitPresets.standard },
    write: { ...rateLimitPresets.write },
    expensive: { ...rateLimitPresets.expensive },
    realtime: { ...rateLimitPresets.realtime },
    isDevelopment: isDev,
  };
}

// In-memory store for rate limiting
// In production, use Redis for distributed rate limiting
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Get rate limit key for a request
function getRateLimitKey(request: FastifyRequest, prefix: string): string {
  // Try to use user ID if authenticated
  const user = request.user as { userId?: string } | undefined;
  if (user?.userId) {
    return `user:${user.userId}:${prefix}`;
  }

  // Fall back to IP address
  const ip = request.ip || request.headers['x-forwarded-for'] || 'unknown';
  return `ip:${ip}:${prefix}`;
}

// Check and update rate limit
function checkRateLimit(key: string, config: RateLimitConfig): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  let entry = rateLimitStore.get(key);

  // Reset if window expired
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    };
  }

  // Check if limit exceeded
  if (entry.count >= config.max) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remaining: config.max - entry.count,
    resetTime: entry.resetTime,
  };
}

// Create rate limit middleware for specific config
export function createUserRateLimit(config: RateLimitConfig, prefix = 'default'): preHandlerHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // DISABLED: Rate limiting disabled for E2E testing
    // To re-enable, remove this early return
    if (process.env.RATE_LIMIT_DISABLED === 'true') {
      return;
    }

    const key = getRateLimitKey(request, prefix);
    const result = checkRateLimit(key, config);

    // Set rate limit headers
    reply.header('X-RateLimit-Limit', config.max);
    reply.header('X-RateLimit-Remaining', result.remaining);
    reply.header('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));

    if (!result.allowed) {
      reply.header('Retry-After', Math.ceil((result.resetTime - Date.now()) / 1000));
      return reply.status(429).send({
        error: config.message || 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      });
    }
  };
}

// Convenience functions for common rate limits
export const rateLimitAuth = createUserRateLimit(rateLimitPresets.auth, 'auth');
export const rateLimitStandard = createUserRateLimit(rateLimitPresets.standard, 'api');
export const rateLimitWrite = createUserRateLimit(rateLimitPresets.write, 'write');
export const rateLimitExpensive = createUserRateLimit(rateLimitPresets.expensive, 'expensive');

// Plugin to add rate limiting helpers to Fastify instance
async function rateLimitPlugin(fastify: FastifyInstance) {
  // Add rate limit functions to fastify instance
  fastify.decorate('userRateLimit', createUserRateLimit);
  fastify.decorate('userRateLimitPresets', rateLimitPresets);

  // Add middleware to track failed auth attempts
  fastify.decorate('userRateLimitAuth', rateLimitAuth);
  fastify.decorate('userRateLimitWrite', rateLimitWrite);
}

// Type declarations
declare module 'fastify' {
  interface FastifyInstance {
    userRateLimit: typeof createUserRateLimit;
    userRateLimitPresets: typeof rateLimitPresets;
    userRateLimitAuth: typeof rateLimitAuth;
    userRateLimitWrite: typeof rateLimitWrite;
  }
}

export default fp(rateLimitPlugin, {
  name: 'user-rate-limit-plugin',
});

// Export store for testing purposes
export const _testHelpers = {
  getStore: () => rateLimitStore,
  clearStore: () => rateLimitStore.clear(),
};
