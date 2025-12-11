import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { prisma } from '../index.js';

export interface JWTPayload {
  userId: string;
  email?: string;
  role?: string;
  type?: string;
  jti?: string;
  iat?: number;
  exp?: number;
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    io: import('socket.io').Server;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JWTPayload;
    user: JWTPayload;
  }
}

async function authPlugin(fastify: FastifyInstance) {
  fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      // Verify JWT token
      await request.jwtVerify();

      const payload = request.user as JWTPayload;

      // Verify session exists and is valid
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (token) {
        const session = await prisma.session.findFirst({
          where: {
            token,
            userId: payload.userId,
            expiresAt: { gt: new Date() },
          },
        });

        if (!session) {
          return reply.status(401).send({ error: 'Session expired or invalid' });
        }
      }

      // Verify user still exists
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, role: true },
      });

      if (!user) {
        return reply.status(401).send({ error: 'User not found' });
      }

      // Update role in request if changed
      request.user = {
        ...payload,
        role: user.role,
      };
    } catch (err) {
      return reply.status(401).send({ error: 'Invalid or expired token' });
    }
  });
}

export default fp(authPlugin, {
  name: 'auth-plugin',
  dependencies: ['@fastify/jwt'],
});
