import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../../index.js';
import { validate } from '../../middleware/validation.middleware.js';
import { rateLimitAuth } from '../../middleware/ratelimit.middleware.js';
import { authSchemas } from '../../schemas/index.js';
import {
  setAuthCookies,
} from '../../utils/cookies.js';

// Type definitions for validated request bodies
type RegisterBody = {
  email: string;
  password: string;
  name: string;
  organizationName?: string;
};

export async function registrationRoutes(fastify: FastifyInstance) {
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
    preHandler: [rateLimitAuth, validate({ body: authSchemas.register })],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as RegisterBody;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existingUser) {
      return reply.status(400).send({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(body.password, 14);

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
      { expiresIn: '30m' }
    );

    const refreshToken = fastify.jwt.sign(
      { userId: user.id, type: 'refresh', jti: crypto.randomUUID() },
      { expiresIn: '7d' }
    );

    // Create session
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        refreshToken,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

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

  // Accept invitation - register via invitation
  fastify.post('/accept-invitation', {
    schema: {
      tags: ['Auth'],
      description: 'Accept an organization invitation and create account',
      body: {
        type: 'object',
        required: ['token', 'password', 'name'],
        properties: {
          token: { type: 'string' },
          password: { type: 'string', minLength: 8 },
          name: { type: 'string', minLength: 2 },
        },
      },
    },
    preHandler: [rateLimitAuth],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { token, password, name } = request.body as { token: string; password: string; name: string };

    // Find valid invitation
    const invitation = await prisma.organizationInvitation.findUnique({
      where: { token },
      include: { organization: true },
    });

    if (!invitation) {
      return reply.status(400).send({ error: 'Invalid invitation token' });
    }

    if (invitation.acceptedAt) {
      return reply.status(400).send({ error: 'Invitation has already been accepted' });
    }

    if (invitation.expiresAt < new Date()) {
      return reply.status(400).send({ error: 'Invitation has expired' });
    }

    // Check if email already has an account
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email },
    });

    if (existingUser) {
      return reply.status(400).send({
        error: 'An account with this email already exists',
        hint: 'Please login to your existing account',
      });
    }

    // Check organization user limit
    const org = invitation.organization;
    const userCount = await prisma.user.count({
      where: { organizationId: org.id },
    });

    if (userCount >= org.maxUsers) {
      return reply.status(400).send({
        error: 'Organization has reached its user limit',
        hint: 'Contact your administrator to upgrade the plan',
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 14);

    // Create user and mark invitation as accepted in a transaction
    const [user] = await prisma.$transaction([
      prisma.user.create({
        data: {
          email: invitation.email,
          passwordHash,
          name,
          role: invitation.role,
          organizationId: invitation.organizationId,
          emailVerified: true, // Email is verified since they received the invitation
          emailVerifiedAt: new Date(),
        },
      }),
      prisma.organizationInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      }),
    ]);

    // Generate unique JWT ID
    const jti = crypto.randomUUID();

    // Generate tokens
    const accessToken = fastify.jwt.sign(
      { userId: user.id, email: user.email, role: user.role, jti },
      { expiresIn: '30m' }
    );

    const refreshToken = fastify.jwt.sign(
      { userId: user.id, type: 'refresh', jti: crypto.randomUUID() },
      { expiresIn: '7d' }
    );

    // Create session
    await prisma.session.create({
      data: {
        userId: user.id,
        token: accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    // Set httpOnly cookies
    setAuthCookies(reply, accessToken, refreshToken);

    fastify.log.info(`User ${user.id} created via invitation to org ${org.id}`);

    return {
      message: 'Account created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
        emailVerified: user.emailVerified,
      },
      organization: {
        id: org.id,
        name: org.name,
      },
    };
  });

  // Get invitation details (public - for preview before accepting)
  fastify.get('/invitation/:token', {
    schema: {
      tags: ['Auth'],
      description: 'Get invitation details for preview',
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { token } = request.params as { token: string };

    const invitation = await prisma.organizationInvitation.findUnique({
      where: { token },
      include: {
        organization: {
          select: { id: true, name: true, logoUrl: true },
        },
      },
    });

    if (!invitation) {
      return reply.status(404).send({ error: 'Invitation not found' });
    }

    if (invitation.acceptedAt) {
      return reply.status(400).send({ error: 'Invitation has already been accepted' });
    }

    if (invitation.expiresAt < new Date()) {
      return reply.status(400).send({ error: 'Invitation has expired' });
    }

    return {
      email: invitation.email,
      role: invitation.role,
      organization: invitation.organization,
      expiresAt: invitation.expiresAt,
    };
  });
}
