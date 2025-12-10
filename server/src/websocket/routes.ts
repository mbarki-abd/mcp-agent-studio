import { FastifyInstance, FastifyRequest } from 'fastify';
import { wsManager } from './manager.js';

export async function websocketRoutes(fastify: FastifyInstance) {
  // WebSocket endpoint for real-time updates
  fastify.get('/ws', {
    websocket: true,
    schema: {
      tags: ['Monitoring'],
      description: 'WebSocket endpoint for real-time agent and server updates',
      security: [{ bearerAuth: [] }],
    },
  }, async (socket, request: FastifyRequest) => {
    // Get token from query string (WebSocket doesn't support headers easily)
    const token = (request.query as { token?: string }).token;

    if (!token) {
      socket.close(4001, 'Missing token');
      return;
    }

    try {
      // Verify JWT
      const decoded = fastify.jwt.verify(token) as { userId: string };

      // Register client
      wsManager.registerClient(socket, decoded.userId);

      fastify.log.info(`WebSocket client connected: ${decoded.userId}`);
    } catch (error) {
      socket.close(4002, 'Invalid token');
    }
  });

  // HTTP endpoint to get WebSocket stats
  fastify.get('/ws/stats', {
    schema: {
      tags: ['Monitoring'],
      description: 'Get WebSocket connection statistics',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { role } = request.user as { role: string };

    if (role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Admin only' });
    }

    return wsManager.getStats();
  });
}
