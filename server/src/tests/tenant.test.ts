/**
 * Tenant Utility Tests
 *
 * Unit tests for multi-tenancy utility functions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTenantContext, TenantContext } from '../utils/tenant.js';

describe('getTenantContext', () => {
  it('should extract tenant context from valid user object', () => {
    const user = {
      userId: 'user-123',
      organizationId: 'org-456',
      role: 'ADMIN',
    };

    const context = getTenantContext(user);

    expect(context).toEqual({
      userId: 'user-123',
      organizationId: 'org-456',
      role: 'ADMIN',
    });
  });

  it('should default role to USER when not provided', () => {
    const user = {
      userId: 'user-123',
      organizationId: 'org-456',
    };

    const context = getTenantContext(user);

    expect(context.role).toBe('USER');
  });

  it('should throw error when userId is missing', () => {
    const user = {
      organizationId: 'org-456',
      role: 'USER',
    };

    expect(() => getTenantContext(user)).toThrow('Invalid user context: missing userId or organizationId');
  });

  it('should throw error when organizationId is missing', () => {
    const user = {
      userId: 'user-123',
      role: 'USER',
    };

    expect(() => getTenantContext(user)).toThrow('Invalid user context: missing userId or organizationId');
  });

  it('should throw error when user is null', () => {
    expect(() => getTenantContext(null)).toThrow('Invalid user context: missing userId or organizationId');
  });

  it('should throw error when user is undefined', () => {
    expect(() => getTenantContext(undefined)).toThrow('Invalid user context: missing userId or organizationId');
  });

  it('should handle user object with extra fields', () => {
    const user = {
      userId: 'user-123',
      organizationId: 'org-456',
      role: 'MEMBER',
      email: 'test@example.com',
      name: 'Test User',
    };

    const context = getTenantContext(user);

    expect(context).toEqual({
      userId: 'user-123',
      organizationId: 'org-456',
      role: 'MEMBER',
    });
  });
});

describe('TenantContext Interface', () => {
  it('should accept valid TenantContext', () => {
    const context: TenantContext = {
      userId: 'user-123',
      organizationId: 'org-456',
      role: 'ADMIN',
    };

    expect(context.userId).toBe('user-123');
    expect(context.organizationId).toBe('org-456');
    expect(context.role).toBe('ADMIN');
  });
});
