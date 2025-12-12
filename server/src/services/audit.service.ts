/**
 * Audit Logging Service
 *
 * Provides comprehensive audit logging for security, compliance,
 * and debugging purposes.
 */

import { AuditAction, AuditStatus, Prisma } from '@prisma/client';
import { prisma } from '../index.js';

export interface AuditEntry {
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  method?: string;
  path?: string;
  status?: AuditStatus;
  statusCode?: number;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
  errorMessage?: string;
  duration?: number;
}

export interface AuditQueryOptions {
  userId?: string;
  action?: AuditAction;
  resource?: string;
  resourceId?: string;
  status?: AuditStatus;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

class AuditService {
  /**
   * Log an audit entry
   */
  async log(entry: AuditEntry): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: entry.userId,
          userEmail: entry.userEmail,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId,
          method: entry.method,
          path: entry.path,
          status: entry.status ?? 'SUCCESS',
          statusCode: entry.statusCode,
          oldValue: entry.oldValue as Prisma.InputJsonValue,
          newValue: entry.newValue as Prisma.InputJsonValue,
          metadata: entry.metadata as Prisma.InputJsonValue,
          errorMessage: entry.errorMessage,
          duration: entry.duration,
        },
      });
    } catch (error) {
      // Log to console but don't throw - audit should not break the app
      console.error('[Audit] Failed to write audit log:', error);
    }
  }

  /**
   * Log a successful action
   */
  async logSuccess(
    action: AuditAction,
    resource: string,
    context: Omit<AuditEntry, 'action' | 'resource' | 'status'>
  ): Promise<void> {
    await this.log({
      action,
      resource,
      status: 'SUCCESS',
      ...context,
    });
  }

  /**
   * Log a failed action
   */
  async logFailure(
    action: AuditAction,
    resource: string,
    errorMessage: string,
    context: Omit<AuditEntry, 'action' | 'resource' | 'status' | 'errorMessage'>
  ): Promise<void> {
    await this.log({
      action,
      resource,
      status: 'FAILURE',
      errorMessage,
      ...context,
    });
  }

  /**
   * Query audit logs
   */
  async query(options: AuditQueryOptions = {}) {
    const where: Prisma.AuditLogWhereInput = {};

    if (options.userId) where.userId = options.userId;
    if (options.action) where.action = options.action;
    if (options.resource) where.resource = options.resource;
    if (options.resourceId) where.resourceId = options.resourceId;
    if (options.status) where.status = options.status;

    if (options.startDate || options.endDate) {
      where.timestamp = {};
      if (options.startDate) where.timestamp.gte = options.startDate;
      if (options.endDate) where.timestamp.lte = options.endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: options.limit ?? 50,
        skip: options.offset ?? 0,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }

  /**
   * Get audit logs for a specific resource
   */
  async getResourceHistory(resource: string, resourceId: string, limit = 20) {
    return prisma.auditLog.findMany({
      where: { resource, resourceId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  /**
   * Get audit logs for a specific user
   */
  async getUserActivity(userId: string, limit = 50) {
    return prisma.auditLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  /**
   * Get failed login attempts (security monitoring)
   */
  async getFailedLogins(hours = 24, limit = 100) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    return prisma.auditLog.findMany({
      where: {
        action: 'LOGIN_FAILED',
        timestamp: { gte: since },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  /**
   * Get recent admin actions (compliance)
   */
  async getAdminActions(hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    return prisma.auditLog.findMany({
      where: {
        action: { in: ['ADMIN_ACTION', 'CONFIG_CHANGE', 'EXPORT_DATA'] },
        timestamp: { gte: since },
      },
      orderBy: { timestamp: 'desc' },
    });
  }

  /**
   * Get audit statistics
   */
  async getStats(hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [totalActions, failedActions, byAction, byResource] = await Promise.all([
      prisma.auditLog.count({
        where: { timestamp: { gte: since } },
      }),
      prisma.auditLog.count({
        where: { timestamp: { gte: since }, status: 'FAILURE' },
      }),
      prisma.auditLog.groupBy({
        by: ['action'],
        where: { timestamp: { gte: since } },
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
        take: 10,
      }),
      prisma.auditLog.groupBy({
        by: ['resource'],
        where: { timestamp: { gte: since } },
        _count: { resource: true },
        orderBy: { _count: { resource: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      totalActions,
      failedActions,
      successRate: totalActions > 0 ? ((totalActions - failedActions) / totalActions) * 100 : 100,
      byAction: byAction.map(a => ({ action: a.action, count: a._count.action })),
      byResource: byResource.map(r => ({ resource: r.resource, count: r._count.resource })),
    };
  }

  /**
   * Clean up old audit logs (data retention)
   */
  async cleanup(daysToKeep = 90) {
    const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    const result = await prisma.auditLog.deleteMany({
      where: { timestamp: { lt: cutoff } },
    });

    return { deleted: result.count };
  }
}

// Singleton instance
export const auditService = new AuditService();

// Helper to extract request context for audit logging
export function extractAuditContext(request: {
  user?: { id: string; email: string };
  ip?: string;
  headers?: { 'user-agent'?: string };
  method?: string;
  url?: string;
}) {
  return {
    userId: request.user?.id,
    userEmail: request.user?.email,
    ipAddress: request.ip,
    userAgent: request.headers?.['user-agent'],
    method: request.method,
    path: request.url,
  };
}
