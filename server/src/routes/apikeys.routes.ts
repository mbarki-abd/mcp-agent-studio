import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '../index.js';
import { getTenantContext } from '../utils/tenant.js';

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'OPERATOR', 'USER', 'VIEWER']).optional().default('USER'),
  scopes: z.array(z.string()).optional().default([]),
  expiresIn: z.number().min(1).max(365).optional(), // Days until expiration
  rateLimit: z.number().min(1).max(10000).optional().default(1000),
});

const updateApiKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  rateLimit: z.number().min(1).max(10000).optional(),
});

// Generate a secure API key
function generateApiKey(): { key: string; prefix: string; hash: string } {
  const rawKey = crypto.randomBytes(32).toString('base64url');
  const key = `mcp_${rawKey}`;
  const prefix = `mcp_${rawKey.substring(0, 8)}`;
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  return { key, prefix, hash };
}

export async function apiKeyRoutes(fastify: FastifyInstance) {
  // List user's API keys
  fastify.get('/', {
    schema: {
      tags: ['API Keys'],
      description: 'List all API keys for the current user',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest) => {
    const { userId, organizationId } = getTenantContext(request.user);

    const apiKeys = await prisma.apiKey.findMany({
      where: {
        userId,
        organizationId,
        revokedAt: null, // Only show active keys
      },
      select: {
        id: true,
        name: true,
        description: true,
        keyPrefix: true,
        role: true,
        scopes: true,
        lastUsedAt: true,
        usageCount: true,
        rateLimit: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      apiKeys: apiKeys.map((key) => ({
        ...key,
        isExpired: key.expiresAt ? key.expiresAt < new Date() : false,
      })),
      total: apiKeys.length,
    };
  });

  // Create new API key
  fastify.post('/', {
    schema: {
      tags: ['API Keys'],
      description: 'Create a new API key',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId, organizationId, role } = getTenantContext(request.user);
    const body = createApiKeySchema.parse(request.body);

    // Users can only create API keys with role equal or lower than their own
    const roleHierarchy = ['VIEWER', 'USER', 'OPERATOR', 'MANAGER', 'ADMIN'];
    const userRoleIndex = roleHierarchy.indexOf(role || 'USER');
    const requestedRoleIndex = roleHierarchy.indexOf(body.role);

    if (requestedRoleIndex > userRoleIndex) {
      return reply.status(403).send({
        error: 'Cannot create API key with higher role than your own',
        yourRole: role,
        requestedRole: body.role,
      });
    }

    // Check API key limit per user (max 10)
    const existingCount = await prisma.apiKey.count({
      where: { userId, revokedAt: null },
    });

    if (existingCount >= 10) {
      return reply.status(400).send({
        error: 'API key limit reached',
        limit: 10,
        current: existingCount,
        hint: 'Revoke unused API keys to create new ones',
      });
    }

    // Generate the key
    const { key, prefix, hash } = generateApiKey();

    // Calculate expiration
    const expiresAt = body.expiresIn
      ? new Date(Date.now() + body.expiresIn * 24 * 60 * 60 * 1000)
      : null;

    // Create the API key
    const apiKey = await prisma.apiKey.create({
      data: {
        name: body.name,
        description: body.description,
        keyHash: hash,
        keyPrefix: prefix,
        userId,
        organizationId,
        role: body.role,
        scopes: body.scopes,
        rateLimit: body.rateLimit,
        expiresAt,
      },
    });

    // Return the full key only once (at creation time)
    return {
      id: apiKey.id,
      name: apiKey.name,
      description: apiKey.description,
      key, // Full key - shown only once!
      keyPrefix: apiKey.keyPrefix,
      role: apiKey.role,
      scopes: apiKey.scopes,
      rateLimit: apiKey.rateLimit,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
      warning: 'Save this API key securely. It will not be shown again!',
    };
  });

  // Get API key details
  fastify.get('/:keyId', {
    schema: {
      tags: ['API Keys'],
      description: 'Get API key details',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = getTenantContext(request.user);
    const { keyId } = request.params as { keyId: string };

    const apiKey = await prisma.apiKey.findFirst({
      where: { id: keyId, userId },
      select: {
        id: true,
        name: true,
        description: true,
        keyPrefix: true,
        role: true,
        scopes: true,
        lastUsedAt: true,
        usageCount: true,
        rateLimit: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
      },
    });

    if (!apiKey) {
      return reply.status(404).send({ error: 'API key not found' });
    }

    return {
      ...apiKey,
      isExpired: apiKey.expiresAt ? apiKey.expiresAt < new Date() : false,
      isRevoked: !!apiKey.revokedAt,
    };
  });

  // Update API key
  fastify.patch('/:keyId', {
    schema: {
      tags: ['API Keys'],
      description: 'Update API key details',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = getTenantContext(request.user);
    const { keyId } = request.params as { keyId: string };
    const body = updateApiKeySchema.parse(request.body);

    // Check ownership
    const apiKey = await prisma.apiKey.findFirst({
      where: { id: keyId, userId, revokedAt: null },
    });

    if (!apiKey) {
      return reply.status(404).send({ error: 'API key not found or already revoked' });
    }

    const updated = await prisma.apiKey.update({
      where: { id: keyId },
      data: body,
      select: {
        id: true,
        name: true,
        description: true,
        keyPrefix: true,
        rateLimit: true,
      },
    });

    return {
      ...updated,
      message: 'API key updated successfully',
    };
  });

  // Revoke API key
  fastify.delete('/:keyId', {
    schema: {
      tags: ['API Keys'],
      description: 'Revoke an API key',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = getTenantContext(request.user);
    const { keyId } = request.params as { keyId: string };

    // Check ownership
    const apiKey = await prisma.apiKey.findFirst({
      where: { id: keyId, userId },
    });

    if (!apiKey) {
      return reply.status(404).send({ error: 'API key not found' });
    }

    if (apiKey.revokedAt) {
      return reply.status(400).send({ error: 'API key is already revoked' });
    }

    await prisma.apiKey.update({
      where: { id: keyId },
      data: { revokedAt: new Date() },
    });

    return {
      message: 'API key revoked successfully',
      keyPrefix: apiKey.keyPrefix,
    };
  });

  // Regenerate API key (revoke old, create new with same settings)
  fastify.post('/:keyId/regenerate', {
    schema: {
      tags: ['API Keys'],
      description: 'Regenerate an API key (creates new key with same settings)',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId, organizationId } = getTenantContext(request.user);
    const { keyId } = request.params as { keyId: string };

    // Get the existing key
    const existingKey = await prisma.apiKey.findFirst({
      where: { id: keyId, userId, revokedAt: null },
    });

    if (!existingKey) {
      return reply.status(404).send({ error: 'API key not found or already revoked' });
    }

    // Generate new key
    const { key, prefix, hash } = generateApiKey();

    // Revoke old key and create new one in a transaction
    const [, newApiKey] = await prisma.$transaction([
      prisma.apiKey.update({
        where: { id: keyId },
        data: { revokedAt: new Date() },
      }),
      prisma.apiKey.create({
        data: {
          name: existingKey.name,
          description: existingKey.description,
          keyHash: hash,
          keyPrefix: prefix,
          userId,
          organizationId,
          role: existingKey.role,
          scopes: existingKey.scopes,
          rateLimit: existingKey.rateLimit,
          expiresAt: existingKey.expiresAt,
        },
      }),
    ]);

    return {
      id: newApiKey.id,
      name: newApiKey.name,
      key, // Full key - shown only once!
      keyPrefix: newApiKey.keyPrefix,
      previousKeyRevoked: true,
      warning: 'Save this API key securely. It will not be shown again!',
    };
  });

  // Get API key usage statistics
  fastify.get('/:keyId/usage', {
    schema: {
      tags: ['API Keys'],
      description: 'Get API key usage statistics',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = getTenantContext(request.user);
    const { keyId } = request.params as { keyId: string };

    const apiKey = await prisma.apiKey.findFirst({
      where: { id: keyId, userId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        usageCount: true,
        lastUsedAt: true,
        rateLimit: true,
        createdAt: true,
      },
    });

    if (!apiKey) {
      return reply.status(404).send({ error: 'API key not found' });
    }

    // Calculate usage stats
    const daysSinceCreation = Math.max(1, Math.ceil(
      (Date.now() - apiKey.createdAt.getTime()) / (24 * 60 * 60 * 1000)
    ));
    const averageRequestsPerDay = Math.round(apiKey.usageCount / daysSinceCreation);

    return {
      keyId: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      stats: {
        totalRequests: apiKey.usageCount,
        lastUsedAt: apiKey.lastUsedAt,
        averageRequestsPerDay,
        rateLimit: apiKey.rateLimit,
        rateLimitPeriod: 'hour',
      },
    };
  });

  // List all organization API keys (admin only)
  fastify.get('/org/all', {
    schema: {
      tags: ['API Keys'],
      description: 'List all API keys in the organization (admin only)',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate, fastify.requireRole('ADMIN')],
  }, async (request: FastifyRequest) => {
    const { organizationId } = getTenantContext(request.user);

    const apiKeys = await prisma.apiKey.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        description: true,
        keyPrefix: true,
        userId: true,
        role: true,
        lastUsedAt: true,
        usageCount: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get user emails for display
    const userIds = [...new Set(apiKeys.map((k) => k.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, name: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return {
      apiKeys: apiKeys.map((key) => ({
        ...key,
        user: userMap.get(key.userId) || { email: 'Unknown', name: 'Unknown' },
        isExpired: key.expiresAt ? key.expiresAt < new Date() : false,
        isRevoked: !!key.revokedAt,
      })),
      total: apiKeys.length,
      active: apiKeys.filter((k) => !k.revokedAt).length,
      revoked: apiKeys.filter((k) => k.revokedAt).length,
    };
  });

  // Revoke user's API key (admin only)
  fastify.delete('/org/:keyId', {
    schema: {
      tags: ['API Keys'],
      description: 'Revoke any API key in the organization (admin only)',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate, fastify.requireRole('ADMIN')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { organizationId } = getTenantContext(request.user);
    const { keyId } = request.params as { keyId: string };

    const apiKey = await prisma.apiKey.findFirst({
      where: { id: keyId, organizationId },
    });

    if (!apiKey) {
      return reply.status(404).send({ error: 'API key not found' });
    }

    if (apiKey.revokedAt) {
      return reply.status(400).send({ error: 'API key is already revoked' });
    }

    await prisma.apiKey.update({
      where: { id: keyId },
      data: { revokedAt: new Date() },
    });

    return {
      message: 'API key revoked successfully',
      keyPrefix: apiKey.keyPrefix,
      userId: apiKey.userId,
    };
  });
}
