import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { prisma } from '../../index.js';
import { validate } from '../../middleware/validation.middleware.js';
import { rateLimitAuth } from '../../middleware/ratelimit.middleware.js';
import { authSchemas } from '../../schemas/index.js';
import { emailService } from '../../services/email.service.js';

export async function emailVerificationRoutes(fastify: FastifyInstance) {
  // Verify email - complete verification
  fastify.post('/verify-email', {
    schema: {
      tags: ['Auth'],
      description: 'Verify email using token from email',
      body: {
        type: 'object',
        required: ['token'],
        properties: {
          token: { type: 'string' },
        },
      },
    },
    preHandler: [validate({ body: authSchemas.verifyEmail })],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { token } = request.body as { token: string };

    // Hash the token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find valid verification token
    const verificationToken = await prisma.emailVerificationToken.findFirst({
      where: {
        token: hashedToken,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!verificationToken) {
      return reply.status(400).send({ error: 'Invalid or expired verification token' });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: verificationToken.userId },
    });

    if (!user) {
      return reply.status(400).send({ error: 'User not found' });
    }

    if (user.emailVerified) {
      return reply.status(400).send({ error: 'Email is already verified' });
    }

    // Update user and mark token as used
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      }),
      prisma.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: { used: true },
      }),
    ]);

    fastify.log.info(`Email verified for user ${user.id}`);

    return { message: 'Email verified successfully' };
  });

  // Send email verification - request verification email
  fastify.post('/send-verification', {
    schema: {
      tags: ['Auth'],
      description: 'Request email verification (for authenticated users)',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const decoded = request.user as { userId: string };

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    if (user.emailVerified) {
      return reply.status(400).send({ error: 'Email is already verified' });
    }

    // Invalidate any existing verification tokens for this user
    await prisma.emailVerificationToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

    // Create verification token record (expires in 24 hours)
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // Send email verification email
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verifyUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;
    await emailService.sendEmailVerification(user.email, verificationToken, verifyUrl);

    fastify.log.info(`Email verification requested for ${user.email}. Token: ${verificationToken.substring(0, 8)}...`);

    return { message: 'Verification email sent' };
  });

  // Resend verification email (for unauthenticated users)
  fastify.post('/resend-verification', {
    schema: {
      tags: ['Auth'],
      description: 'Resend email verification (using email address)',
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' },
        },
      },
    },
    preHandler: [rateLimitAuth, validate({ body: authSchemas.resendVerification })],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { email } = request.body as { email: string };

    // Find user (don't reveal if user exists)
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return { message: 'If an account with that email exists and is not verified, a verification link has been sent' };
    }

    if (user.emailVerified) {
      return { message: 'If an account with that email exists and is not verified, a verification link has been sent' };
    }

    // Invalidate any existing verification tokens for this user
    await prisma.emailVerificationToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

    // Create verification token record (expires in 24 hours)
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // Send email verification email
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verifyUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;
    await emailService.sendEmailVerification(user.email, verificationToken, verifyUrl);

    fastify.log.info(`Email verification resent for ${user.email}. Token: ${verificationToken.substring(0, 8)}...`);

    return { message: 'If an account with that email exists and is not verified, a verification link has been sent' };
  });
}
