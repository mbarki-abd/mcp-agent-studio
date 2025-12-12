import { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { prisma } from '../index.js';

const API_KEY_HEADER = 'x-api-key';
const API_KEY_PREFIX = 'mcp_';

interface ApiKeyPayload {
  userId: string;
  organizationId: string;
  role: string;
  apiKeyId: string;
  scopes: string[];
  isApiKey: true;
}

/**
 * Validate an API key and return the associated user info
 */
export async function validateApiKey(apiKey: string): Promise<ApiKeyPayload | null> {
  // Check prefix
  if (!apiKey.startsWith(API_KEY_PREFIX)) {
    return null;
  }

  // Hash the key to compare with stored hash
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

  // Find the API key
  const apiKeyRecord = await prisma.apiKey.findUnique({
    where: { keyHash },
  });

  if (!apiKeyRecord) {
    return null;
  }

  // Check if revoked
  if (apiKeyRecord.revokedAt) {
    return null;
  }

  // Check if expired
  if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
    return null;
  }

  // Update usage stats (async, non-blocking)
  prisma.apiKey.update({
    where: { id: apiKeyRecord.id },
    data: {
      lastUsedAt: new Date(),
      usageCount: { increment: 1 },
    },
  }).catch(() => {
    // Ignore errors in usage tracking
  });

  return {
    userId: apiKeyRecord.userId,
    organizationId: apiKeyRecord.organizationId,
    role: apiKeyRecord.role,
    apiKeyId: apiKeyRecord.id,
    scopes: apiKeyRecord.scopes,
    isApiKey: true,
  };
}

/**
 * Middleware to authenticate requests using API key
 * Can be used as an alternative to JWT authentication
 */
export async function authenticateApiKey(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const apiKey = request.headers[API_KEY_HEADER] as string | undefined;

  if (!apiKey) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: `Missing ${API_KEY_HEADER} header`,
    });
  }

  const payload = await validateApiKey(apiKey);

  if (!payload) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Invalid or expired API key',
    });
  }

  // Set user on request (compatible with existing auth)
  request.user = payload;
}

/**
 * Middleware that accepts both JWT (via cookie/header) and API key
 * Useful for endpoints that need to support both auth methods
 */
export function authenticateAny(fastify: ReturnType<typeof import('fastify').default>) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // Check for API key first
    const apiKey = request.headers[API_KEY_HEADER] as string | undefined;

    if (apiKey) {
      const payload = await validateApiKey(apiKey);
      if (payload) {
        request.user = payload;
        return;
      }
    }

    // Fall back to JWT authentication
    try {
      await fastify.authenticate(request, reply);
    } catch {
      // If both methods fail
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Valid JWT or API key required',
      });
    }
  };
}

/**
 * Check if request is authenticated via API key
 */
export function isApiKeyAuth(request: FastifyRequest): boolean {
  return !!(request.user && (request.user as ApiKeyPayload).isApiKey);
}

/**
 * Get API key ID if authenticated via API key
 */
export function getApiKeyId(request: FastifyRequest): string | null {
  if (isApiKeyAuth(request)) {
    return (request.user as ApiKeyPayload).apiKeyId;
  }
  return null;
}

/**
 * Check if API key has a specific scope
 */
export function hasScope(request: FastifyRequest, scope: string): boolean {
  if (!isApiKeyAuth(request)) {
    return true; // JWT users have all scopes
  }

  const user = request.user as ApiKeyPayload;

  // Empty scopes means all permissions
  if (!user.scopes || user.scopes.length === 0) {
    return true;
  }

  // Check for wildcard
  if (user.scopes.includes('*')) {
    return true;
  }

  return user.scopes.includes(scope);
}

/**
 * Middleware to require specific scope for API key access
 */
export function requireScope(scope: string) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!hasScope(request, scope)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: `API key missing required scope: ${scope}`,
      });
    }
  };
}

// Rate limiting state for API keys (in-memory, consider Redis for production)
const rateLimitState = new Map<string, { count: number; resetAt: number }>();

/**
 * Rate limit middleware for API key requests
 */
export async function rateLimitApiKey(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!isApiKeyAuth(request)) {
    return; // Only rate limit API key requests
  }

  const apiKeyId = getApiKeyId(request)!;
  const now = Date.now();
  const hourMs = 60 * 60 * 1000;

  // Get current state
  let state = rateLimitState.get(apiKeyId);

  // Reset if hour has passed
  if (!state || now >= state.resetAt) {
    state = { count: 0, resetAt: now + hourMs };
    rateLimitState.set(apiKeyId, state);
  }

  // Get rate limit for this key
  const apiKey = await prisma.apiKey.findUnique({
    where: { id: apiKeyId },
    select: { rateLimit: true },
  });

  const limit = apiKey?.rateLimit || 1000;

  // Check limit
  if (state.count >= limit) {
    const retryAfter = Math.ceil((state.resetAt - now) / 1000);
    reply.header('X-RateLimit-Limit', limit);
    reply.header('X-RateLimit-Remaining', 0);
    reply.header('X-RateLimit-Reset', Math.ceil(state.resetAt / 1000));
    reply.header('Retry-After', retryAfter);

    return reply.status(429).send({
      error: 'Rate limit exceeded',
      limit,
      retryAfter,
    });
  }

  // Increment count
  state.count++;

  // Set rate limit headers
  reply.header('X-RateLimit-Limit', limit);
  reply.header('X-RateLimit-Remaining', limit - state.count);
  reply.header('X-RateLimit-Reset', Math.ceil(state.resetAt / 1000));
}
