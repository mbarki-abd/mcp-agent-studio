/**
 * System Configuration Routes
 * Admin-only endpoints for viewing and managing system settings
 */
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { getCurrentRateLimits, _testHelpers } from '../middleware/ratelimit.middleware.js';
import { prisma } from '../index.js';
import os from 'os';

// System config stored in database
interface SystemConfig {
  id: string;
  key: string;
  value: string;
  category: string;
  description: string;
  updatedAt: Date;
  updatedBy: string | null;
}

export const systemRoutes: FastifyPluginAsync = async (fastify) => {
  // All routes require ADMIN role
  fastify.addHook('preHandler', async (request, reply) => {
    await fastify.authenticate(request, reply);
    const user = request.user as { role?: string };
    if (user?.role !== 'ADMIN') {
      return reply.status(403).send({
        error: 'Admin access required',
        code: 'ADMIN_REQUIRED'
      });
    }
  });

  /**
   * GET /api/system/info
   * Get system information (CPU, memory, uptime, etc.)
   */
  fastify.get('/info', async (request, reply) => {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      server: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: uptime,
        uptimeFormatted: formatUptime(uptime),
        pid: process.pid,
      },
      memory: {
        heapUsed: formatBytes(memoryUsage.heapUsed),
        heapTotal: formatBytes(memoryUsage.heapTotal),
        rss: formatBytes(memoryUsage.rss),
        external: formatBytes(memoryUsage.external),
      },
      system: {
        totalMemory: formatBytes(os.totalmem()),
        freeMemory: formatBytes(os.freemem()),
        cpus: os.cpus().length,
        loadAverage: os.loadavg(),
        hostname: os.hostname(),
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        port: process.env.PORT || '3000',
      }
    };
  });

  /**
   * GET /api/system/rate-limits
   * Get current rate limit configuration
   */
  fastify.get('/rate-limits', async (request, reply) => {
    const limits = getCurrentRateLimits();
    const store = _testHelpers.getStore();

    return {
      config: limits,
      stats: {
        activeEntries: store.size,
        // Group by type
        entriesByType: groupEntriesByType(store),
      },
      envVars: {
        RATE_LIMIT_AUTH_MAX: process.env.RATE_LIMIT_AUTH_MAX || 'default (50)',
        RATE_LIMIT_AUTH_WINDOW_MS: process.env.RATE_LIMIT_AUTH_WINDOW_MS || 'default (300000)',
        RATE_LIMIT_STANDARD_MAX: process.env.RATE_LIMIT_STANDARD_MAX || 'default (500)',
        RATE_LIMIT_WRITE_MAX: process.env.RATE_LIMIT_WRITE_MAX || 'default (100)',
      }
    };
  });

  /**
   * POST /api/system/rate-limits/reset
   * Reset all rate limit counters (emergency use)
   */
  fastify.post('/rate-limits/reset', async (request, reply) => {
    _testHelpers.clearStore();

    // Log this action
    fastify.log.warn(`Rate limits reset by admin: ${(request.user as { userId: string }).userId}`);

    return {
      success: true,
      message: 'All rate limit counters have been reset'
    };
  });

  /**
   * GET /api/system/config
   * Get all system configuration values
   */
  fastify.get('/config', async (request, reply) => {
    // Try to get config from database, or return defaults
    let dbConfigs: SystemConfig[] = [];
    try {
      dbConfigs = await prisma.$queryRaw<SystemConfig[]>`
        SELECT * FROM "SystemConfig" ORDER BY category, key
      `;
    } catch {
      // Table might not exist yet
    }

    // Default configurations (not stored in DB but available)
    const defaults = {
      security: {
        sessionTimeout: process.env.SESSION_TIMEOUT || '24h',
        jwtExpiry: process.env.JWT_EXPIRY || '15m',
        refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY || '7d',
        maxLoginAttempts: process.env.MAX_LOGIN_ATTEMPTS || '5',
      },
      features: {
        emailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === 'true',
        mfaEnabled: process.env.MFA_ENABLED === 'true',
        registrationEnabled: process.env.REGISTRATION_ENABLED !== 'false',
        maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
      },
      limits: {
        maxServersPerOrg: process.env.MAX_SERVERS_PER_ORG || '50',
        maxAgentsPerOrg: process.env.MAX_AGENTS_PER_ORG || '100',
        maxTasksPerDay: process.env.MAX_TASKS_PER_DAY || '1000',
        maxApiKeysPerUser: process.env.MAX_API_KEYS_PER_USER || '10',
      },
      notifications: {
        emailEnabled: process.env.EMAIL_ENABLED === 'true',
        slackEnabled: process.env.SLACK_ENABLED === 'true',
        webhooksEnabled: process.env.WEBHOOKS_ENABLED !== 'false',
      }
    };

    return {
      database: dbConfigs,
      defaults,
      environment: process.env.NODE_ENV,
    };
  });

  /**
   * GET /api/system/health-detailed
   * Get detailed health status
   */
  fastify.get('/health-detailed', async (request, reply) => {
    const checks: Record<string, { status: string; latency?: number; error?: string }> = {};

    // Database check
    const dbStart = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = { status: 'healthy', latency: Date.now() - dbStart };
    } catch (e) {
      checks.database = { status: 'unhealthy', error: (e as Error).message };
    }

    // Redis check (if configured)
    if (process.env.REDIS_HOST) {
      checks.redis = { status: 'configured' };
    } else {
      checks.redis = { status: 'not_configured' };
    }

    // Email service check
    checks.email = {
      status: process.env.SMTP_HOST ? 'configured' : 'not_configured'
    };

    return {
      status: Object.values(checks).every(c => c.status !== 'unhealthy') ? 'healthy' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    };
  });

  /**
   * GET /api/system/stats
   * Get system statistics
   */
  fastify.get('/stats', async (request, reply) => {
    const [
      userCount,
      orgCount,
      serverCount,
      agentCount,
      taskCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.organization.count(),
      prisma.serverConfiguration.count(),
      prisma.agent.count(),
      prisma.task.count(),
    ]);

    // Get recent activity counts
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      tasksToday,
      tasksThisWeek,
      auditLogsToday,
    ] = await Promise.all([
      prisma.task.count({ where: { createdAt: { gte: oneDayAgo } } }),
      prisma.task.count({ where: { createdAt: { gte: oneWeekAgo } } }),
      prisma.auditLog.count({ where: { timestamp: { gte: oneDayAgo } } }),
    ]);

    return {
      totals: {
        users: userCount,
        organizations: orgCount,
        servers: serverCount,
        agents: agentCount,
        tasks: taskCount,
      },
      activity: {
        tasksToday,
        tasksThisWeek,
        auditLogsToday,
      },
      timestamp: new Date().toISOString(),
    };
  });
};

// Helper functions
function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(2)} ${units[i]}`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(' ');
}

function groupEntriesByType(store: Map<string, unknown>): Record<string, number> {
  const groups: Record<string, number> = {};
  for (const key of store.keys()) {
    const type = key.split(':').pop() || 'unknown';
    groups[type] = (groups[type] || 0) + 1;
  }
  return groups;
}

export default systemRoutes;
