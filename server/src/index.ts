import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import websocket from '@fastify/websocket';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

import authPlugin from './middleware/auth.middleware.js';

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
  // CORS
  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  // Security headers
  await fastify.register(helmet, {
    contentSecurityPolicy: false,
  });

  // JWT
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'super-secret-key-change-in-production',
  });

  // Rate limiting
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Auth plugin (must be after JWT)
  await fastify.register(authPlugin);

  // WebSocket
  await fastify.register(websocket);

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

// Health check route
fastify.get('/health', async () => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  };
});

// API info route
fastify.get('/api', async () => {
  return {
    name: 'MCP Agent Studio API',
    version: '0.1.0',
    documentation: '/docs',
  };
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

    // Start listening
    const port = parseInt(process.env.PORT || '3000', 10);
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    fastify.log.info(`Server running at http://${host}:${port}`);
    fastify.log.info(`API docs at http://${host}:${port}/docs`);
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
    await fastify.close();
    await prisma.$disconnect();
    process.exit(0);
  });
});

// Run
start();
