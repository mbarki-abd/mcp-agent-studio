import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { prisma } from '../index.js';
import { COOKIE_ACCESS_TOKEN } from '../utils/cookies.js';

export interface JWTPayload {
  userId: string;
  email?: string;
  role?: string;
  organizationId?: string;
  type?: string;
  jti?: string;
  iat?: number;
  exp?: number;
}

// Extended user context with organization for multi-tenancy
export interface UserContext extends JWTPayload {
  userId: string;
  organizationId: string;
  role: string;
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
      // Get token from httpOnly cookie or Authorization header (fallback)
      const cookieToken = request.cookies[COOKIE_ACCESS_TOKEN];
      const headerToken = request.headers.authorization?.replace('Bearer ', '');
      const token = cookieToken || headerToken;

      if (!token) {
        return reply.status(401).send({ error: 'No authentication token provided' });
      }

      // Verify JWT token manually if using cookie
      if (cookieToken && !headerToken) {
        const decoded = fastify.jwt.verify(cookieToken) as JWTPayload;
        request.user = decoded;
      } else {
        // Use standard jwtVerify for Authorization header
        await request.jwtVerify();
      }

      const payload = request.user as JWTPayload;

      // Verify session exists and is valid
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

      // Verify user still exists and get organization
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, role: true, organizationId: true },
      });

      if (!user) {
        return reply.status(401).send({ error: 'User not found' });
      }

      // Update role and organizationId in request
      request.user = {
        ...payload,
        role: user.role,
        organizationId: user.organizationId,
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
