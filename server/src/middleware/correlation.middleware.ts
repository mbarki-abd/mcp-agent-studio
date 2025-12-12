import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import fp from 'fastify-plugin';

// Correlation ID header name
const CORRELATION_ID_HEADER = 'x-correlation-id';
const REQUEST_ID_HEADER = 'x-request-id';

// Extend Fastify types
declare module 'fastify' {
  interface FastifyRequest {
    correlationId: string;
    requestId: string;
    requestStartTime: number;
  }

  interface FastifyReply {
    setCorrelationHeader(): void;
  }
}

/**
 * Generate a unique correlation ID
 */
function generateCorrelationId(): string {
  return `${Date.now().toString(36)}-${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return crypto.randomUUID();
}

/**
 * Correlation ID middleware
 * - Generates or propagates correlation IDs for request tracing
 * - Adds request timing information
 * - Sets response headers for traceability
 */
async function correlationPlugin(fastify: FastifyInstance) {
  // Add correlation ID to every request
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Get or generate correlation ID (for distributed tracing)
    const correlationId =
      (request.headers[CORRELATION_ID_HEADER] as string) || generateCorrelationId();

    // Always generate a new request ID for this specific request
    const requestId = generateRequestId();

    // Store timing
    const requestStartTime = Date.now();

    // Attach to request
    request.correlationId = correlationId;
    request.requestId = requestId;
    request.requestStartTime = requestStartTime;

    // Decorator to set correlation header on reply
    reply.setCorrelationHeader = () => {
      reply.header(CORRELATION_ID_HEADER, correlationId);
      reply.header(REQUEST_ID_HEADER, requestId);
    };

    // Set headers immediately
    reply.setCorrelationHeader();
  });

  // Log request completion with timing
  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const duration = Date.now() - request.requestStartTime;
    const user = request.user as { userId?: string } | undefined;

    // Skip health check logging
    if (request.url === '/health' || request.url === '/ready') {
      return;
    }

    fastify.log.info({
      correlationId: request.correlationId,
      requestId: request.requestId,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      duration,
      userId: user?.userId,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    }, `${request.method} ${request.url} ${reply.statusCode} ${duration}ms`);
  });

  // Log errors with correlation ID
  fastify.addHook('onError', async (request: FastifyRequest, reply: FastifyReply, error: Error) => {
    fastify.log.error({
      correlationId: request.correlationId,
      requestId: request.requestId,
      method: request.method,
      url: request.url,
      error: {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
    }, `Request error: ${error.message}`);
  });
}

export default fp(correlationPlugin, {
  name: 'correlation-plugin',
  fastify: '4.x',
});

/**
 * Helper to get correlation context for use in services
 */
export function getCorrelationContext(request: FastifyRequest) {
  return {
    correlationId: request.correlationId,
    requestId: request.requestId,
    startTime: request.requestStartTime,
  };
}

/**
 * Helper to create a child logger with correlation context
 */
export function createCorrelatedLogger(request: FastifyRequest, fastify: FastifyInstance) {
  return fastify.log.child({
    correlationId: request.correlationId,
    requestId: request.requestId,
  });
}
