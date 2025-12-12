/**
 * User-Based Rate Limiting Middleware
 *
 * Provides per-user rate limiting for authenticated endpoints.
 * Falls back to IP-based limiting for unauthenticated requests.
 */
import { FastifyInstance, FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';
import fp from 'fastify-plugin';

// Rate limit configuration by endpoint type
export interface RateLimitConfig {
  max: number;           // Maximum requests
  windowMs: number;      // Time window in milliseconds
  message?: string;      // Custom error message
  skipSuccessfulRequests?: boolean;  // Don't count successful requests
  skipFailedRequests?: boolean;      // Don't count failed requests
}

// Default configurations for different endpoint types
export const rateLimitPresets = {
  // Auth endpoints - stricter limits to prevent brute force
  auth: {
    max: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many authentication attempts, please try again later',
  },
  // Standard API endpoints
  standard: {
    max: 100,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many requests, please slow down',
  },
  // Write operations (create, update, delete)
  write: {
    max: 30,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many write operations, please slow down',
  },
  // Expensive operations (reports, exports)
  expensive: {
    max: 10,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many expensive operations, please wait',
  },
  // Real-time/WebSocket subscriptions
  realtime: {
    max: 50,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many subscription requests',
  },
} as const;

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
