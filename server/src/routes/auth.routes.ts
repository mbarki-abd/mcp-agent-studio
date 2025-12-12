import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../index.js';
import { auditLogin, auditLogout } from '../middleware/audit.middleware.js';

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  organizationName: z.string().min(2).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function authRoutes(fastify: FastifyInstance) {
  // Register
  fastify.post('/register', {
    schema: {
      tags: ['Auth'],
      description: 'Register a new user',
      body: {
        type: 'object',
        required: ['email', 'password', 'name'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          name: { type: 'string', minLength: 2 },
          organizationName: { type: 'string', minLength: 2 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = registerSchema.parse(request.body);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existingUser) {
      return reply.status(400).send({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(body.password, 10);

    // Create organization
    const orgName = body.organizationName || `${body.name}'s Organization`;
    const orgSlug = orgName.toLowerCase().replace(/[^a-z0-9]/g, '-');

    const organization = await prisma.organization.create({
      data: {
        name: orgName,
        slug: `${orgSlug}-${Date.now()}`,
        plan: 'FREE',
      },
    });

    // Create user
    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        name: body.name,
        role: 'ADMIN', // First user is admin
        organizationId: organization.id,
      },
    });

    // Generate unique JWT ID to prevent token collisions
    const jti = crypto.randomUUID();

    // Generate tokens
    const token = fastify.jwt.sign(
      { userId: user.id, email: user.email, role: user.role, jti },
      { expiresIn: '7d' }
    );

    const refreshToken = fastify.jwt.sign(
      { userId: user.id, type: 'refresh', jti: crypto.randomUUID() },
      { expiresIn: '30d' }
    );

    // Create session
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
      },
      token,
      refreshToken,
    };
  });

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
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = loginSchema.parse(request.body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (!user) {
      // Log failed login attempt (user not found)
      await auditLogin(request, false, undefined, body.email, 'User not found');
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(body.password, user.passwordHash);

    if (!validPassword) {
      // Log failed login attempt (wrong password)
      await auditLogin(request, false, user.id, user.email, 'Invalid password');
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    // Generate unique JWT ID to prevent token collisions
    const jti = crypto.randomUUID();

    // Generate tokens
    const token = fastify.jwt.sign(
      { userId: user.id, email: user.email, role: user.role, jti },
      { expiresIn: '7d' }
    );

    const refreshToken = fastify.jwt.sign(
      { userId: user.id, type: 'refresh', jti: crypto.randomUUID() },
      { expiresIn: '30d' }
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
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Log successful login
    await auditLogin(request, true, user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
      },
      token,
      refreshToken,
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
    const token = request.headers.authorization?.replace('Bearer ', '');
    const decoded = request.user as { userId: string; email: string };

    if (token) {
      await prisma.session.deleteMany({
        where: { token },
      });
    }

    // Log logout
    await auditLogout(request, decoded.userId, decoded.email);

    return { message: 'Logged out successfully' };
  });

  // Refresh token
  fastify.post('/refresh', {
    schema: {
      tags: ['Auth'],
      description: 'Refresh access token',
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { refreshToken } = request.body as { refreshToken: string };

    // Find session
    const session = await prisma.session.findUnique({
      where: { refreshToken },
    });

    if (!session) {
      return reply.status(401).send({ error: 'Invalid refresh token' });
    }

    // Verify token
    try {
      const decoded = fastify.jwt.verify(refreshToken) as { userId: string; type: string };

      if (decoded.type !== 'refresh') {
        return reply.status(401).send({ error: 'Invalid token type' });
      }

      // Get user
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      // Generate new tokens
      const newToken = fastify.jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        { expiresIn: '7d' }
      );

      const newRefreshToken = fastify.jwt.sign(
        { userId: user.id, type: 'refresh' },
        { expiresIn: '30d' }
      );

      // Update session
      await prisma.session.update({
        where: { id: session.id },
        data: {
          token: newToken,
          refreshToken: newRefreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      return {
        token: newToken,
        refreshToken: newRefreshToken,
      };
    } catch {
      return reply.status(401).send({ error: 'Invalid refresh token' });
    }
  });
}

// Declare authenticate decorator
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
