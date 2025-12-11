import { FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { timeRequest } from '../utils/metrics.js';

interface RequestLog {
  requestId: string;
  method: string;
  url: string;
  userAgent?: string;
  ip?: string;
  userId?: string;
  startTime: number;
  duration?: number;
  statusCode?: number;
  contentLength?: number;
}

async function loggingPlugin(fastify: ReturnType<typeof import('fastify').default>) {
  // Skip logging for health checks, metrics, and static assets
  const skipPaths = ['/health', '/ready', '/metrics', '/favicon.ico', '/docs'];

  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    // Store start time for duration calculation
    (request as any).startTime = Date.now();
  });

  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip logging for certain paths
    if (skipPaths.some(path => request.url.startsWith(path))) {
      return;
    }

    const startTime = (request as any).startTime || Date.now();
    const duration = Date.now() - startTime;

    const log: RequestLog = {
      requestId: request.id,
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      userId: (request as any).user?.id,
      startTime,
      duration,
      statusCode: reply.statusCode,
      contentLength: parseInt(reply.getHeader('content-length') as string) || undefined,
    };

    // Log level based on status code
    if (reply.statusCode >= 500) {
      request.log.error({ req: log }, 'Request completed with server error');
    } else if (reply.statusCode >= 400) {
      request.log.warn({ req: log }, 'Request completed with client error');
    } else if (duration > 1000) {
      // Slow request warning (>1s)
      request.log.warn({ req: log }, 'Slow request detected');
    } else {
      request.log.info({ req: log }, 'Request completed');
    }

    // Record metrics
    timeRequest(duration, {
      method: request.method,
      status: String(reply.statusCode),
      route: request.routeOptions?.url || request.url,
    });
  });

  // Log unhandled errors
  fastify.addHook('onError', async (request: FastifyRequest, reply: FastifyReply, error: Error) => {
    const startTime = (request as any).startTime || Date.now();
    const duration = Date.now() - startTime;

    request.log.error({
      requestId: request.id,
      method: request.method,
      url: request.url,
      userId: (request as any).user?.id,
      duration,
      error: {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      },
    }, 'Unhandled error in request');
  });
}

export default fp(loggingPlugin, {
  name: 'logging-plugin',
});
