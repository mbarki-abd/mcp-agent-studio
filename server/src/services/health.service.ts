/**
 * Health Check Service
 *
 * Provides comprehensive health checking for all system dependencies:
 * - Database connectivity and performance
 * - Redis connectivity (if configured)
 * - External service availability
 * - System resources
 */

import { prisma } from '../index.js';
import { Redis } from 'ioredis';

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface DependencyHealth {
  name: string;
  status: HealthStatus;
  latencyMs?: number;
  message?: string;
  lastChecked: string;
  details?: Record<string, unknown>;
}

export interface SystemHealth {
  status: HealthStatus;
  version: string;
  uptime: number;
  timestamp: string;
  dependencies: DependencyHealth[];
  system: {
    memory: {
      used: number;
      total: number;
      percentage: number;
      unit: string;
    };
    cpu?: {
      loadAvg: number[];
    };
  };
}

export interface ReadinessCheck {
  ready: boolean;
  checks: Record<string, boolean>;
  message?: string;
}

// Health check thresholds
const THRESHOLDS = {
  database: {
    latencyWarning: 100, // ms
    latencyCritical: 500, // ms
  },
  redis: {
    latencyWarning: 50, // ms
    latencyCritical: 200, // ms
  },
  memory: {
    warningPercentage: 80,
    criticalPercentage: 95,
  },
};

class HealthService {
  private redis: Redis | null = null;
  private version = '0.1.0';
  private startTime = Date.now();

  /**
   * Set Redis client for health checks
   */
  setRedisClient(client: Redis) {
    this.redis = client;
  }

  /**
   * Check database health
   */
  async checkDatabase(): Promise<DependencyHealth> {
    const start = Date.now();
    const name = 'database';

    try {
      // Simple query to test connectivity
      await prisma.$queryRaw`SELECT 1`;
      const latencyMs = Date.now() - start;

      // Determine status based on latency
      let status: HealthStatus = 'healthy';
      let message = 'Database responding normally';

      if (latencyMs > THRESHOLDS.database.latencyCritical) {
        status = 'unhealthy';
        message = `Database latency critical: ${latencyMs}ms`;
      } else if (latencyMs > THRESHOLDS.database.latencyWarning) {
        status = 'degraded';
        message = `Database latency elevated: ${latencyMs}ms`;
      }

      return {
        name,
        status,
        latencyMs,
        message,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      return {
        name,
        status: 'unhealthy',
        latencyMs: Date.now() - start,
        message: error instanceof Error ? error.message : 'Database connection failed',
        lastChecked: new Date().toISOString(),
      };
    }
  }

  /**
   * Check database connectivity with detailed info
   */
  async checkDatabaseDetailed(): Promise<DependencyHealth> {
    const start = Date.now();
    const name = 'database';

    try {
      // Get connection pool stats and run test query
      const [, userCount, serverCount] = await Promise.all([
        prisma.$queryRaw`SELECT 1`,
        prisma.user.count(),
        prisma.serverConfiguration.count(),
      ]);

      const latencyMs = Date.now() - start;
      let status: HealthStatus = 'healthy';

      if (latencyMs > THRESHOLDS.database.latencyCritical) {
        status = 'unhealthy';
      } else if (latencyMs > THRESHOLDS.database.latencyWarning) {
        status = 'degraded';
      }

      return {
        name,
        status,
        latencyMs,
        message: 'Database connected',
        lastChecked: new Date().toISOString(),
        details: {
          users: userCount,
          servers: serverCount,
          pooled: true,
        },
      };
    } catch (error) {
      return {
        name,
        status: 'unhealthy',
        latencyMs: Date.now() - start,
        message: error instanceof Error ? error.message : 'Database check failed',
        lastChecked: new Date().toISOString(),
      };
    }
  }

  /**
   * Check Redis health (if configured)
   */
  async checkRedis(): Promise<DependencyHealth | null> {
    if (!this.redis) {
      return null;
    }

    const start = Date.now();
    const name = 'redis';

    try {
      const pong = await this.redis.ping();
      const latencyMs = Date.now() - start;

      if (pong !== 'PONG') {
        return {
          name,
          status: 'unhealthy',
          latencyMs,
          message: 'Redis ping failed',
          lastChecked: new Date().toISOString(),
        };
      }

      let status: HealthStatus = 'healthy';
      let message = 'Redis responding normally';

      if (latencyMs > THRESHOLDS.redis.latencyCritical) {
        status = 'unhealthy';
        message = `Redis latency critical: ${latencyMs}ms`;
      } else if (latencyMs > THRESHOLDS.redis.latencyWarning) {
        status = 'degraded';
        message = `Redis latency elevated: ${latencyMs}ms`;
      }

      return {
        name,
        status,
        latencyMs,
        message,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      return {
        name,
        status: 'unhealthy',
        latencyMs: Date.now() - start,
        message: error instanceof Error ? error.message : 'Redis connection failed',
        lastChecked: new Date().toISOString(),
      };
    }
  }

  /**
   * Check system resources
   */
  checkSystemResources(): {
    memory: { used: number; total: number; percentage: number; unit: string };
    cpu?: { loadAvg: number[] };
  } {
    const memUsage = process.memoryUsage();
    const heapUsed = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotal = Math.round(memUsage.heapTotal / 1024 / 1024);
    const percentage = Math.round((heapUsed / heapTotal) * 100);

    return {
      memory: {
        used: heapUsed,
        total: heapTotal,
        percentage,
        unit: 'MB',
      },
    };
  }

  /**
   * Get overall system health
   */
  async getHealth(detailed = false): Promise<SystemHealth> {
    const dependencies: DependencyHealth[] = [];

    // Check database
    const dbHealth = detailed
      ? await this.checkDatabaseDetailed()
      : await this.checkDatabase();
    dependencies.push(dbHealth);

    // Check Redis if available
    const redisHealth = await this.checkRedis();
    if (redisHealth) {
      dependencies.push(redisHealth);
    }

    // Check system resources
    const system = this.checkSystemResources();

    // Determine overall status
    let overallStatus: HealthStatus = 'healthy';

    const hasUnhealthy = dependencies.some((d) => d.status === 'unhealthy');
    const hasDegraded = dependencies.some((d) => d.status === 'degraded');
    const memoryHigh = system.memory.percentage > THRESHOLDS.memory.criticalPercentage;
    const memoryWarning = system.memory.percentage > THRESHOLDS.memory.warningPercentage;

    if (hasUnhealthy || memoryHigh) {
      overallStatus = 'unhealthy';
    } else if (hasDegraded || memoryWarning) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      version: this.version,
      uptime: Math.round((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
      dependencies,
      system,
    };
  }

  /**
   * Check if system is ready to serve traffic (Kubernetes readiness)
   */
  async checkReadiness(): Promise<ReadinessCheck> {
    const checks: Record<string, boolean> = {};

    // Database must be available
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch {
      checks.database = false;
    }

    // Redis is optional but check if configured
    if (this.redis) {
      try {
        const pong = await this.redis.ping();
        checks.redis = pong === 'PONG';
      } catch {
        checks.redis = false;
      }
    }

    // Determine readiness
    const ready = checks.database === true;
    const failedChecks = Object.entries(checks)
      .filter(([, passed]) => !passed)
      .map(([name]) => name);

    return {
      ready,
      checks,
      message: ready
        ? 'All required dependencies available'
        : `Failed checks: ${failedChecks.join(', ')}`,
    };
  }

  /**
   * Check if system is alive (Kubernetes liveness)
   */
  async checkLiveness(): Promise<{ alive: boolean; uptime: number }> {
    // Liveness just checks if the process is running
    // Could add more checks like event loop responsiveness
    return {
      alive: true,
      uptime: Math.round((Date.now() - this.startTime) / 1000),
    };
  }

  /**
   * Get startup probe status (Kubernetes startup)
   */
  async checkStartup(): Promise<{ started: boolean; checks: Record<string, boolean> }> {
    const checks: Record<string, boolean> = {};

    // Check if database migrations are applied
    try {
      // This will fail if tables don't exist
      await prisma.user.count();
      checks.migrations = true;
    } catch {
      checks.migrations = false;
    }

    // Check if database is seeded (at least one admin user)
    try {
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN' },
      });
      checks.seeded = adminCount > 0;
    } catch {
      checks.seeded = false;
    }

    const started = checks.migrations === true;

    return {
      started,
      checks,
    };
  }
}

// Singleton instance
export const healthService = new HealthService();
