import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../../index.js';
import { auditLogin, auditLogout } from '../../middleware/audit.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';
import { rateLimitAuth } from '../../middleware/ratelimit.middleware.js';
import { authSchemas } from '../../schemas/index.js';
import {
  setAuthCookies,
  clearAuthCookies,
  COOKIE_ACCESS_TOKEN,
  COOKIE_REFRESH_TOKEN,
} from '../../utils/cookies.js';

// Type definitions for validated request bodies
type LoginBody = {
  email: string;
  password: string;
};

export async function authenticationRoutes(fastify: FastifyInstance) {
  // Login
  fastify.post('/login', {
    schema: {
      tags: ['Auth'],
      description: 'Login with email and password',
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
    },
    preHandler: [rateLimitAuth, validate({ body: authSchemas.login })],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as LoginBody;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (!user) {
      // Log failed login attempt (user not found)
      await auditLogin(request, false, undefined, body.email, 'User not found');
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(body.password, user.passwordHash);

    if (!validPassword) {
      // Log failed login attempt (wrong password)
      await auditLogin(request, false, user.id, user.email, 'Invalid password');
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    // Generate unique JWT ID to prevent token collisions
    const jti = crypto.randomUUID();

    // Generate tokens
    const token = fastify.jwt.sign(
      { userId: user.id, email: user.email, role: user.role, jti },
      { expiresIn: '30m' }
    );

    const refreshToken = fastify.jwt.sign(
      { userId: user.id, type: 'refresh', jti: crypto.randomUUID() },
      { expiresIn: '7d' }
    );

    // Delete existing sessions for this user
    await prisma.session.deleteMany({
      where: { userId: user.id },
    });

    // Create session
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        refreshToken,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    // Log successful login
    await auditLogin(request, true, user.id, user.email);

    // Set httpOnly cookies
    setAuthCookies(reply, token, refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
        emailVerified: user.emailVerified,
      },
    };
  });

  // Get current user
  fastify.get('/me', {
    schema: {
      tags: ['Auth'],
      description: 'Get current authenticated user',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const decoded = request.user as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { organization: true },
    });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.emailVerified,
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        plan: user.organization.plan,
      },
    };
  });

  // Logout
  fastify.post('/logout', {
    schema: {
      tags: ['Auth'],
      description: 'Logout current session',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    // Get token from cookie or header
    const token = request.cookies[COOKIE_ACCESS_TOKEN] ||
      request.headers.authorization?.replace('Bearer ', '');
    const decoded = request.user as { userId: string; email: string };

    if (token) {
      await prisma.session.deleteMany({
        where: { token },
      });
    }

    // Log logout
    await auditLogout(request, decoded.userId, decoded.email);

    // Clear httpOnly cookies
    clearAuthCookies(reply);

    return { message: 'Logged out successfully' };
  });

  // Refresh token
  fastify.post('/refresh', {
    schema: {
      tags: ['Auth'],
      description: 'Refresh access token (reads from httpOnly cookie or body)',
    },
    preHandler: [validate({ body: authSchemas.refreshToken })],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    // Get refresh token from cookie or body (fallback for backward compatibility)
    const body = request.body as { refreshToken?: string } | undefined;
    const refreshToken = request.cookies[COOKIE_REFRESH_TOKEN] || body?.refreshToken;

    if (!refreshToken) {
      return reply.status(401).send({ error: 'No refresh token provided' });
    }

    // Find session
    const session = await prisma.session.findUnique({
      where: { refreshToken },
    });

    if (!session) {
      clearAuthCookies(reply);
      return reply.status(401).send({ error: 'Invalid refresh token' });
    }

    // Verify token
    try {
      const decoded = fastify.jwt.verify(refreshToken) as { userId: string; type: string };

      if (decoded.type !== 'refresh') {
        clearAuthCookies(reply);
        return reply.status(401).send({ error: 'Invalid token type' });
      }

      // Get user
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user) {
        clearAuthCookies(reply);
        return reply.status(404).send({ error: 'User not found' });
      }

      // Generate new tokens
      const newToken = fastify.jwt.sign(
        { userId: user.id, email: user.email, role: user.role, jti: crypto.randomUUID() },
        { expiresIn: '30m' }
      );

      const newRefreshToken = fastify.jwt.sign(
        { userId: user.id, type: 'refresh', jti: crypto.randomUUID() },
        { expiresIn: '7d' }
      );

      // Update session
      await prisma.session.update({
        where: { id: session.id },
        data: {
          token: newToken,
          refreshToken: newRefreshToken,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      });

      // Set new httpOnly cookies
      setAuthCookies(reply, newToken, newRefreshToken);

      return { message: 'Tokens refreshed successfully' };
    } catch {
      clearAuthCookies(reply);
      return reply.status(401).send({ error: 'Invalid refresh token' });
    }
  });

  // Update profile
  fastify.patch('/profile', {
    schema: {
      tags: ['Auth'],
      description: 'Update user profile',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 100 },
        },
      },
    },
    preHandler: [fastify.authenticate, validate({ body: authSchemas.updateProfile })],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const decoded = request.user as { userId: string };
    const { name } = request.body as { name?: string };

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(name && { name }),
      },
      include: { organization: true },
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      emailVerified: updatedUser.emailVerified,
      organization: {
        id: updatedUser.organization.id,
        name: updatedUser.organization.name,
        plan: updatedUser.organization.plan,
      },
    };
  });
}
