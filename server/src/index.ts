import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fastifySocketIO from 'fastify-socket.io';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

import authPlugin from './middleware/auth.middleware.js';
import rbacPlugin from './middleware/rbac.middleware.js';
import errorHandlerPlugin from './middleware/error.middleware.js';
import loggingPlugin from './middleware/logging.middleware.js';
import { getScheduler } from './services/scheduler.service.js';
import { metrics } from './utils/metrics.js';
import { circuitBreakers } from './utils/circuit-breaker.js';

// Environment configuration with validation
const isProduction = process.env.NODE_ENV === 'production';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret && isProduction) {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  if (!secret) {
    console.warn('⚠️  WARNING: Using default JWT secret. Set JWT_SECRET in production!');
    return 'dev-secret-change-in-production';
  }
  return secret;
}

function getCorsOrigin(): string | string[] {
  const origin = process.env.CORS_ORIGIN;
  if (!origin && isProduction) {
    throw new Error('CORS_ORIGIN environment variable is required in production');
  }
  if (!origin) {
    // Development: allow localhost origins
    return ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];
  }
  // Support comma-separated origins
  return origin.includes(',') ? origin.split(',').map(o => o.trim()) : origin;
}

// Initialize Prisma
export const prisma = new PrismaClient();

// Create Fastify instance
const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    },
  },
});

// Register plugins
async function registerPlugins() {
  // Error handler (register early)
  await fastify.register(errorHandlerPlugin);

  // Request logging (register early for full coverage)
  await fastify.register(loggingPlugin);

  // CORS
  await fastify.register(cors, {
    origin: getCorsOrigin(),
    credentials: true,
  });

  // Security headers
  await fastify.register(helmet, {
    contentSecurityPolicy: false,
  });

  // JWT
  await fastify.register(jwt, {
    secret: getJwtSecret(),
  });

  // Rate limiting
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Auth plugin (must be after JWT)
  await fastify.register(authPlugin);

  // RBAC plugin (must be after Auth)
  await fastify.register(rbacPlugin);

  // Socket.IO
  await fastify.register(fastifySocketIO, {
    cors: {
      origin: getCorsOrigin(),
      credentials: true,
    },
  });

  // Swagger documentation
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'MCP Agent Studio API',
        description: 'Multi-Agent Orchestration Platform API',
        version: '0.1.0',
      },
      servers: [
        { url: process.env.API_URL || 'http://localhost:3000', description: 'API Server' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [{ bearerAuth: [] }],
      tags: [
        { name: 'Auth', description: 'Authentication endpoints' },
        { name: 'Servers', description: 'Server configuration management' },
        { name: 'Agents', description: 'Agent management' },
        { name: 'Tasks', description: 'Task management' },
        { name: 'Tools', description: 'Unix tools management' },
        { name: 'Monitoring', description: 'Real-time monitoring' },
      ],
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });
}

// Health check route with detailed status
fastify.get('/health', async () => {
  const dbHealthy = await prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false);

  return {
    status: dbHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      unit: 'MB',
    },
    checks: {
      database: dbHealthy ? 'up' : 'down',
    },
  };
});

// Readiness probe (for Kubernetes)
fastify.get('/ready', async () => {
  const dbReady = await prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false);

  if (!dbReady) {
    throw { statusCode: 503, message: 'Database not ready' };
  }

  return { status: 'ready' };
});

// API info route
fastify.get('/api', async () => {
  return {
    name: 'MCP Agent Studio API',
    version: '0.1.0',
    documentation: '/docs',
  };
});

// Prometheus metrics endpoint
fastify.get('/metrics', async (request, reply) => {
  reply.header('Content-Type', 'text/plain; version=0.0.4');
  return metrics.export();
});

// Circuit breaker status endpoint
fastify.get('/api/circuit-breakers', async () => {
  const circuits: Record<string, unknown> = {};
  for (const [name, breaker] of circuitBreakers.getAll()) {
    circuits[name] = breaker.getStats();
  }
  return { circuits };
});

// Import and register routes
async function registerRoutes() {
  // Auth routes
  const { authRoutes } = await import('./routes/auth.routes.js');
  await fastify.register(authRoutes, { prefix: '/api/auth' });

  // Server configuration routes
  const { serverRoutes } = await import('./routes/servers.routes.js');
  await fastify.register(serverRoutes, { prefix: '/api/servers' });

  // Agent routes
  const { agentRoutes } = await import('./routes/agents.routes.js');
  await fastify.register(agentRoutes, { prefix: '/api/agents' });

  // Task routes
  const { taskRoutes } = await import('./routes/tasks.routes.js');
  await fastify.register(taskRoutes, { prefix: '/api/tasks' });

  // Tools routes
  const { toolRoutes } = await import('./routes/tools.routes.js');
  await fastify.register(toolRoutes, { prefix: '/api/tools' });

  // Chat routes
  const { chatRoutes } = await import('./routes/chat.routes.js');
  await fastify.register(chatRoutes, { prefix: '/api/chat' });

  // WebSocket routes (monitoring)
  const { websocketRoutes } = await import('./websocket/routes.js');
  await fastify.register(websocketRoutes, { prefix: '/api/monitoring' });
}

// Start server
async function start() {
  try {
    // Connect to database
    await prisma.$connect();
    fastify.log.info('Connected to database');

    // Register plugins
    await registerPlugins();

    // Register routes
    await registerRoutes();

    // Initialize scheduler service (requires Redis)
    try {
      const scheduler = getScheduler();
      await scheduler.initialize();
      fastify.log.info('Scheduler service initialized');
    } catch (err) {
      fastify.log.warn('Scheduler service failed to initialize (Redis may not be available)');
      fastify.log.warn(err instanceof Error ? err.message : 'Unknown error');
    }

    // Start listening
    const port = parseInt(process.env.PORT || '3000', 10);
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    fastify.log.info(`Server running at http://${host}:${port}`);
    fastify.log.info(`API docs at http://${host}:${port}/docs`);

    // Initialize Socket.IO handlers
    fastify.io.on('connection', (socket) => {
      fastify.log.info(`Socket connected: ${socket.id}`);

      socket.on('subscribe:agent', ({ id }) => {
        socket.join(`agent:${id}`);
        fastify.log.info(`Socket ${socket.id} subscribed to agent:${id}`);
      });

      socket.on('unsubscribe:agent', ({ id }) => {
        socket.leave(`agent:${id}`);
        fastify.log.info(`Socket ${socket.id} unsubscribed from agent:${id}`);
      });

      socket.on('subscribe:server', ({ id }) => {
        socket.join(`server:${id}`);
        fastify.log.info(`Socket ${socket.id} subscribed to server:${id}`);
      });

      socket.on('unsubscribe:server', ({ id }) => {
        socket.leave(`server:${id}`);
        fastify.log.info(`Socket ${socket.id} unsubscribed from server:${id}`);
      });

      // Chat subscriptions
      socket.on('subscribe:chat', ({ sessionId }) => {
        socket.join(`chat:${sessionId}`);
        fastify.log.info(`Socket ${socket.id} subscribed to chat:${sessionId}`);
      });

      socket.on('unsubscribe:chat', ({ sessionId }) => {
        socket.leave(`chat:${sessionId}`);
        fastify.log.info(`Socket ${socket.id} unsubscribed from chat:${sessionId}`);
      });

      socket.on('disconnect', () => {
        fastify.log.info(`Socket disconnected: ${socket.id}`);
      });
    });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    fastify.log.info(`Received ${signal}, shutting down...`);

    // Shutdown scheduler
    try {
      const scheduler = getScheduler();
      await scheduler.shutdown();
      fastify.log.info('Scheduler service shut down');
    } catch (err) {
      fastify.log.warn('Failed to shutdown scheduler');
    }

    await fastify.close();
    await prisma.$disconnect();
    process.exit(0);
  });
});

// Run
start();
