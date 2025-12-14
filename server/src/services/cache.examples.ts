/**
 * CACHE SERVICE - EXEMPLES D'UTILISATION
 *
 * Ce fichier contient des exemples pour utiliser le CacheService
 * dans de nouvelles routes. Copier/adapter selon les besoins.
 */

import { getCacheService, CacheService } from './cache.service.js';
import { FastifyRequest } from 'fastify';

// ============================================================================
// EXEMPLE 1: Route GET simple avec cache
// ============================================================================

export async function exampleSimpleGetRoute(request: FastifyRequest) {
  const cache = getCacheService();
  const cacheKey = 'my-simple-key';

  // Try cache first
  const cached = await cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch data
  const data = { message: 'Hello from DB' };

  // Cache for 5 minutes
  await cache.set(cacheKey, data, 300);

  return data;
}

// ============================================================================
// EXEMPLE 2: Route GET avec parametres (pagination, filtres)
// ============================================================================

export async function exampleGetWithParams(request: FastifyRequest) {
  const query = request.query as { page?: number; limit?: number; search?: string };
  const userId = (request.user as any).userId;

  const cache = getCacheService();

  // Build cache key from parameters
  const cacheParams = JSON.stringify({
    page: query.page || 1,
    limit: query.limit || 20,
    search: query.search,
  });
  const cacheKey = `my-resource:list:${userId}:${cacheParams}`;

  // Try cache
  const cached = await cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch data with filters
  const data = {
    items: [],
    total: 0,
    page: query.page || 1,
  };

  // Cache for 10 minutes
  await cache.set(cacheKey, data, 600);

  return data;
}

// ============================================================================
// EXEMPLE 3: Route POST/PUT avec invalidation
// ============================================================================

export async function exampleCreateRoute(request: FastifyRequest) {
  const userId = (request.user as any).userId;
  const body = request.body as { name: string };

  // Create resource in DB
  const newResource = {
    id: 'new-id',
    name: body.name,
    userId,
  };

  // Invalidate related caches
  const cache = getCacheService();

  // Option 1: Invalidate by pattern (all variations of list)
  await cache.invalidate(`my-resource:list:${userId}*`);

  // Option 2: Invalidate specific keys
  await cache.delete(`my-resource:list:${userId}:default`);

  return newResource;
}

// ============================================================================
// EXEMPLE 4: Route DELETE avec invalidation multiple
// ============================================================================

export async function exampleDeleteRoute(request: FastifyRequest) {
  const { id } = request.params as { id: string };
  const userId = (request.user as any).userId;

  // Delete from DB
  // await prisma.myResource.delete({ where: { id } });

  // Invalidate all related caches
  const cache = getCacheService();
  await cache.invalidate(`my-resource:list:${userId}*`); // List cache
  await cache.delete(`my-resource:details:${id}`);        // Detail cache
  await cache.delete(`my-resource:stats:${id}`);          // Stats cache

  return { message: 'Deleted successfully' };
}

// ============================================================================
// EXEMPLE 5: Cache avec TTL adaptatif
// ============================================================================

export async function exampleAdaptiveTTL(request: FastifyRequest) {
  const cache = getCacheService();
  const resourceType = (request.params as any).type;

  const cacheKey = `resource:${resourceType}`;

  const cached = await cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch data
  const data = { type: resourceType };

  // Adaptive TTL based on data type
  let ttl: number;
  switch (resourceType) {
    case 'static':
      ttl = 3600; // 1 hour for static data
      break;
    case 'dynamic':
      ttl = 60; // 1 minute for dynamic data
      break;
    case 'realtime':
      ttl = 10; // 10 seconds for realtime data
      break;
    default:
      ttl = 300; // 5 minutes default
  }

  await cache.set(cacheKey, data, ttl);

  return data;
}

// ============================================================================
// EXEMPLE 6: Cache avec fallback
// ============================================================================

export async function exampleCacheWithFallback(request: FastifyRequest) {
  const cache = getCacheService();
  const cacheKey = 'expensive-operation';

  // Try cache
  const cached = await cache.get(cacheKey);
  if (cached) {
    return { data: cached, source: 'cache' };
  }

  try {
    // Try expensive operation
    const data = await performExpensiveOperation();

    // Cache result
    await cache.set(cacheKey, data, 600);

    return { data, source: 'database' };
  } catch (error) {
    // If operation fails, try stale cache (even if expired)
    const stale = await cache.get(cacheKey);
    if (stale) {
      return { data: stale, source: 'stale-cache', warning: 'Using stale data' };
    }
    throw error;
  }
}

async function performExpensiveOperation() {
  // Simulate expensive operation
  return { result: 'expensive data' };
}

// ============================================================================
// EXEMPLE 7: Cache warming (pre-chargement)
// ============================================================================

export async function warmupCache() {
  const cache = getCacheService();

  // Pre-load frequently accessed data
  const commonQueries = [
    { key: 'tools:definitions:common', data: { /* ... */ }, ttl: 3600 },
    { key: 'agents:stats:summary', data: { /* ... */ }, ttl: 300 },
  ];

  for (const query of commonQueries) {
    await cache.set(query.key, query.data, query.ttl);
  }

  console.log('Cache warmed up');
}

// ============================================================================
// EXEMPLE 8: Cache stats monitoring
// ============================================================================

export async function getCacheHealthCheck() {
  const cache = getCacheService();

  const stats = await cache.getStats();

  return {
    cache: {
      enabled: stats.enabled,
      keys: stats.keyCount,
      memory: stats.memoryUsed,
    },
    health: stats.enabled ? 'healthy' : 'degraded',
  };
}

// ============================================================================
// EXEMPLE 9: Cache avec compression (pour grandes reponses)
// ============================================================================

export async function exampleCacheWithCompression(request: FastifyRequest) {
  const cache = getCacheService();
  const cacheKey = 'large-dataset';

  const cached = await cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch large dataset
  const largeData = {
    items: new Array(1000).fill({ /* ... */ }),
  };

  // Note: CacheService utilise JSON.stringify
  // Pour de tres grandes reponses, envisager de compresser avant:
  // const compressed = await compress(JSON.stringify(largeData));
  // await cache.set(cacheKey, compressed, 600);

  await cache.set(cacheKey, largeData, 600);

  return largeData;
}

// ============================================================================
// EXEMPLE 10: Organisation multi-tenant cache keys
// ============================================================================

export function buildTenantCacheKey(
  organizationId: string,
  resourceType: string,
  resourceId?: string,
  params?: Record<string, any>
): string {
  const parts = [resourceType, organizationId];

  if (resourceId) {
    parts.push(resourceId);
  }

  if (params) {
    parts.push(JSON.stringify(params));
  }

  return parts.join(':');
}

// Usage:
// const key = buildTenantCacheKey('org-123', 'agents', undefined, { page: 1 });
// => 'agents:org-123:{"page":1}'

// ============================================================================
// BONNES PRATIQUES
// ============================================================================

/**
 * TTL RECOMMANDES:
 *
 * - Donnees statiques (definitions, config): 1 heure (3600s)
 * - Listes avec pagination: 5 minutes (300s)
 * - Details d'une ressource: 5-10 minutes (300-600s)
 * - Statistiques: 10-15 minutes (600-900s)
 * - Donnees temps reel: 30-60 secondes (30-60s)
 */

/**
 * PATTERNS D'INVALIDATION:
 *
 * - Preferer pattern-based invalidation pour les listes
 * - Invalider specifiquement pour les details
 * - Toujours invalider en cascade (liste + details + stats)
 */

/**
 * CACHE KEYS NAMING:
 *
 * Format: {resource}:{type}:{tenant}:{id}:{params}
 *
 * Exemples:
 * - agents:list:org-123:{"page":1,"limit":20}
 * - agents:details:agent-456
 * - tools:definitions:{"category":"devops"}
 * - servers:health:server-789
 */

/**
 * RESILIENCE:
 *
 * - Ne jamais throw si cache.get() echoue
 * - Toujours avoir un fallback vers la DB
 * - Logger les erreurs mais ne pas bloquer
 * - Utiliser cache.isEnabled() pour verifier disponibilite
 */
