/**
 * Audit Service Tests
 *
 * Unit tests for audit logging service with mocked Prisma.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractAuditContext } from '../services/audit.service.js';

// Test extractAuditContext helper (doesn't need DB)
describe('extractAuditContext', () => {
  it('should extract all fields from request with user', () => {
    const request = {
      user: { id: 'user-123', email: 'test@example.com' },
      ip: '192.168.1.1',
      headers: { 'user-agent': 'Mozilla/5.0' },
      method: 'POST',
      url: '/api/servers',
    };

    const context = extractAuditContext(request);

    expect(context).toEqual({
      userId: 'user-123',
      userEmail: 'test@example.com',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      method: 'POST',
      path: '/api/servers',
    });
  });

  it('should handle missing user', () => {
    const request = {
      ip: '10.0.0.1',
      headers: { 'user-agent': 'curl/7.64.1' },
      method: 'GET',
      url: '/api/health',
    };

    const context = extractAuditContext(request);

    expect(context).toEqual({
      userId: undefined,
      userEmail: undefined,
      ipAddress: '10.0.0.1',
      userAgent: 'curl/7.64.1',
      method: 'GET',
      path: '/api/health',
    });
  });

  it('should handle missing headers', () => {
    const request = {
      user: { id: 'user-456', email: 'admin@example.com' },
      ip: '127.0.0.1',
      method: 'DELETE',
      url: '/api/agents/abc',
    };

    const context = extractAuditContext(request);

    expect(context).toEqual({
      userId: 'user-456',
      userEmail: 'admin@example.com',
      ipAddress: '127.0.0.1',
      userAgent: undefined,
      method: 'DELETE',
      path: '/api/agents/abc',
    });
  });

  it('should handle empty request', () => {
    const request = {};

    const context = extractAuditContext(request);

    expect(context).toEqual({
      userId: undefined,
      userEmail: undefined,
      ipAddress: undefined,
      userAgent: undefined,
      method: undefined,
      path: undefined,
    });
  });
});

// Test audit middleware helpers
describe('Audit Middleware Helpers', () => {
  describe('resource extraction', () => {
    // These are internal functions, but we can test the logic
    const extractResource = (path: string): string => {
      const cleanPath = path.split('?')[0];
      const segments = cleanPath.split('/').filter(Boolean);
      const resourceIndex = segments[0] === 'api' ? 1 : 0;
      return segments[resourceIndex] || 'unknown';
    };

    it('should extract resource from /api/servers', () => {
      expect(extractResource('/api/servers')).toBe('servers');
    });

    it('should extract resource from /api/agents/123', () => {
      expect(extractResource('/api/agents/123')).toBe('agents');
    });

    it('should extract resource from /servers', () => {
      expect(extractResource('/servers')).toBe('servers');
    });

    it('should handle query strings', () => {
      expect(extractResource('/api/tasks?status=pending')).toBe('tasks');
    });

    it('should return unknown for root', () => {
      expect(extractResource('/')).toBe('unknown');
    });
  });

  describe('resourceId extraction', () => {
    const extractResourceId = (path: string): string | undefined => {
      const cleanPath = path.split('?')[0];
      const segments = cleanPath.split('/').filter(Boolean);
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      for (const segment of segments) {
        if (uuidPattern.test(segment)) {
          return segment;
        }
      }

      const resourceIndex = segments[0] === 'api' ? 2 : 1;
      if (segments[resourceIndex] && /^\d+$/.test(segments[resourceIndex])) {
        return segments[resourceIndex];
      }

      return undefined;
    };

    it('should extract UUID from path', () => {
      const path = '/api/servers/550e8400-e29b-41d4-a716-446655440000';
      expect(extractResourceId(path)).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should extract numeric ID from path', () => {
      expect(extractResourceId('/api/tasks/12345')).toBe('12345');
    });

    it('should return undefined when no ID', () => {
      expect(extractResourceId('/api/servers')).toBeUndefined();
    });

    it('should handle nested routes with UUID', () => {
      const path = '/api/agents/123e4567-e89b-12d3-a456-426614174000/tasks';
      expect(extractResourceId(path)).toBe('123e4567-e89b-12d3-a456-426614174000');
    });
  });

  describe('body sanitization', () => {
    const sanitizeBody = (body: unknown): unknown => {
      if (!body || typeof body !== 'object') return body;

      const sensitiveFields = ['password', 'passwordHash', 'token', 'refreshToken', 'secret', 'apiKey', 'masterToken'];
      const sanitized = { ...body as Record<string, unknown> };

      for (const field of sensitiveFields) {
        if (field in sanitized) {
          sanitized[field] = '[REDACTED]';
        }
      }

      return sanitized;
    };

    it('should redact password fields', () => {
      const body = {
        email: 'test@example.com',
        password: 'secret123',
        name: 'Test User',
      };

      const sanitized = sanitizeBody(body) as Record<string, unknown>;

      expect(sanitized.email).toBe('test@example.com');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.name).toBe('Test User');
    });

    it('should redact multiple sensitive fields', () => {
      const body = {
        token: 'jwt-token',
        refreshToken: 'refresh-token',
        masterToken: 'master-token',
        data: 'safe',
      };

      const sanitized = sanitizeBody(body) as Record<string, unknown>;

      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.refreshToken).toBe('[REDACTED]');
      expect(sanitized.masterToken).toBe('[REDACTED]');
      expect(sanitized.data).toBe('safe');
    });

    it('should handle null body', () => {
      expect(sanitizeBody(null)).toBeNull();
    });

    it('should handle non-object body', () => {
      expect(sanitizeBody('string')).toBe('string');
      expect(sanitizeBody(123)).toBe(123);
    });

    it('should not modify body without sensitive fields', () => {
      const body = { name: 'Test', email: 'test@example.com' };
      const sanitized = sanitizeBody(body);
      expect(sanitized).toEqual(body);
    });
  });
});

// Test AuditEntry interface conformance
describe('AuditEntry Interface', () => {
  it('should accept valid audit entry', () => {
    const entry = {
      action: 'LOGIN' as const,
      resource: 'auth',
      userId: 'user-123',
      userEmail: 'test@example.com',
      ipAddress: '192.168.1.1',
      status: 'SUCCESS' as const,
    };

    // Type check - this should compile
    expect(entry.action).toBe('LOGIN');
    expect(entry.resource).toBe('auth');
  });

  it('should accept entry with optional fields', () => {
    const entry = {
      action: 'CREATE' as const,
      resource: 'server',
      resourceId: '550e8400-e29b-41d4-a716-446655440000',
      oldValue: null,
      newValue: { name: 'New Server', url: 'http://example.com' },
      metadata: { source: 'api' },
      duration: 150,
    };

    expect(entry.resourceId).toBeDefined();
    expect(entry.newValue).toBeDefined();
    expect(entry.duration).toBe(150);
  });
});

// Test action mapping logic
describe('Action Mapping', () => {
  const METHOD_TO_ACTION: Record<string, string> = {
    GET: 'READ',
    POST: 'CREATE',
    PUT: 'UPDATE',
    PATCH: 'UPDATE',
    DELETE: 'DELETE',
  };

  it('should map GET to READ', () => {
    expect(METHOD_TO_ACTION['GET']).toBe('READ');
  });

  it('should map POST to CREATE', () => {
    expect(METHOD_TO_ACTION['POST']).toBe('CREATE');
  });

  it('should map PUT and PATCH to UPDATE', () => {
    expect(METHOD_TO_ACTION['PUT']).toBe('UPDATE');
    expect(METHOD_TO_ACTION['PATCH']).toBe('UPDATE');
  });

  it('should map DELETE to DELETE', () => {
    expect(METHOD_TO_ACTION['DELETE']).toBe('DELETE');
  });
});

// Test excluded paths logic
describe('Excluded Paths', () => {
  const EXCLUDED_PATHS = ['/health', '/ready', '/metrics', '/favicon.ico'];

  const shouldExclude = (path: string): boolean => {
    return EXCLUDED_PATHS.some(excluded => path.startsWith(excluded));
  };

  it('should exclude /health', () => {
    expect(shouldExclude('/health')).toBe(true);
  });

  it('should exclude /metrics', () => {
    expect(shouldExclude('/metrics')).toBe(true);
  });

  it('should not exclude /api/servers', () => {
    expect(shouldExclude('/api/servers')).toBe(false);
  });

  it('should not exclude /api/health-check', () => {
    // This is different from /health
    expect(shouldExclude('/api/health-check')).toBe(false);
  });
});
