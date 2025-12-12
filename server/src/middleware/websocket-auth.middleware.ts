/**
 * WebSocket Authentication Middleware
 *
 * Authenticates Socket.IO connections using httpOnly cookies.
 * Uses the same JWT validation as the HTTP auth middleware.
 */
import { Socket } from 'socket.io';
import { FastifyInstance } from 'fastify';
import cookie from 'cookie';
import { COOKIE_ACCESS_TOKEN } from '../utils/cookies.js';

// Extended socket interface with user data
interface AuthenticatedSocket extends Socket {
  user?: {
    userId: string;
    email: string;
    role: string;
    organizationId?: string;
  };
}

// Create the WebSocket authentication middleware
export function createWebSocketAuthMiddleware(fastify: FastifyInstance) {
  return async (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
    try {
      // Parse cookies from handshake headers
      const cookieHeader = socket.handshake.headers.cookie;

      if (!cookieHeader) {
        fastify.log.warn(`Socket ${socket.id} connection rejected: No cookies`);
        return next(new Error('Authentication required'));
      }

      const cookies = cookie.parse(cookieHeader);
      const token = cookies[COOKIE_ACCESS_TOKEN];

      if (!token) {
        fastify.log.warn(`Socket ${socket.id} connection rejected: No access token cookie`);
        return next(new Error('Authentication required'));
      }

      // Verify the JWT token
      try {
        const decoded = fastify.jwt.verify(token) as {
          userId: string;
          email: string;
          role: string;
          organizationId?: string;
        };

        // Attach user info to socket
        socket.user = {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role,
          organizationId: decoded.organizationId,
        };

        fastify.log.info(`Socket ${socket.id} authenticated as user ${decoded.userId}`);
        next();
      } catch (jwtError) {
        fastify.log.warn(`Socket ${socket.id} connection rejected: Invalid token`);
        return next(new Error('Invalid authentication token'));
      }
    } catch (error) {
      fastify.log.error({ error }, 'WebSocket authentication error');
      return next(new Error('Authentication failed'));
    }
  };
}

// Type guard to check if socket is authenticated
export function isAuthenticated(socket: Socket): socket is AuthenticatedSocket & { user: NonNullable<AuthenticatedSocket['user']> } {
  return 'user' in socket && socket.user !== undefined;
}

// Get user from authenticated socket (throws if not authenticated)
export function getSocketUser(socket: Socket) {
  if (!isAuthenticated(socket)) {
    throw new Error('Socket is not authenticated');
  }
  return socket.user;
}

export type { AuthenticatedSocket };
