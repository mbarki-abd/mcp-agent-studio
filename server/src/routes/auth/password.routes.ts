import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../../index.js';
import { validate } from '../../middleware/validation.middleware.js';
import { rateLimitAuth } from '../../middleware/ratelimit.middleware.js';
import { authSchemas } from '../../schemas/index.js';
import { COOKIE_ACCESS_TOKEN } from '../../utils/cookies.js';

export async function passwordRoutes(fastify: FastifyInstance) {
  // Change password
  fastify.post('/change-password', {
    schema: {
      tags: ['Auth'],
      description: 'Change password (requires current password)',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string' },
          newPassword: { type: 'string', minLength: 8 },
        },
      },
    },
    preHandler: [fastify.authenticate, validate({ body: authSchemas.changePassword })],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const decoded = request.user as { userId: string };
    const { currentPassword, newPassword } = request.body as { currentPassword: string; newPassword: string };

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!validPassword) {
      return reply.status(401).send({ error: 'Current password is incorrect' });
    }

    // Check that new password is different from current
    const samePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (samePassword) {
      return reply.status(400).send({ error: 'New password must be different from current password' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 14);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Invalidate all sessions except current (force other devices to re-login)
    const currentToken = request.cookies[COOKIE_ACCESS_TOKEN] ||
      request.headers.authorization?.replace('Bearer ', '');

    if (currentToken) {
      await prisma.session.deleteMany({
        where: {
          userId: user.id,
          token: { not: currentToken },
        },
      });
    }

    fastify.log.info(`Password changed for user ${user.id}`);

    return { message: 'Password changed successfully' };
  });

  // Forgot password - request reset
  fastify.post('/forgot-password', {
    schema: {
      tags: ['Auth'],
      description: 'Request a password reset email',
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' },
        },
      },
    },
    preHandler: [rateLimitAuth, validate({ body: authSchemas.forgotPassword })],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { email } = request.body as { email: string };

    // Find user (don't reveal if user exists)
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return { message: 'If an account with that email exists, a reset link has been sent' };
    }

    // Invalidate any existing reset tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Create reset token record (expires in 1 hour)
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // TODO: Send email with reset link
    // In production, integrate with email service (SendGrid, SES, etc.)
    // The reset link would be: ${FRONTEND_URL}/reset-password?token=${resetToken}
    fastify.log.info(`Password reset requested for ${email}. Token: ${resetToken.substring(0, 8)}...`);

    return { message: 'If an account with that email exists, a reset link has been sent' };
  });

  // Reset password - complete reset
  fastify.post('/reset-password', {
    schema: {
      tags: ['Auth'],
      description: 'Reset password using token from email',
      body: {
        type: 'object',
        required: ['token', 'newPassword'],
        properties: {
          token: { type: 'string' },
          newPassword: { type: 'string', minLength: 8 },
        },
      },
    },
    preHandler: [rateLimitAuth, validate({ body: authSchemas.resetPassword })],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { token, newPassword } = request.body as { token: string; newPassword: string };

    // Hash the token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find valid reset token
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        token: hashedToken,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!resetToken) {
      return reply.status(400).send({ error: 'Invalid or expired reset token' });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: resetToken.userId },
    });

    if (!user) {
      return reply.status(400).send({ error: 'User not found' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 14);

    // Update password and mark token as used
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
      // Invalidate all sessions for this user (force re-login)
      prisma.session.deleteMany({
        where: { userId: user.id },
      }),
    ]);

    fastify.log.info(`Password reset completed for user ${user.id}`);

    return { message: 'Password has been reset successfully. Please login with your new password.' };
  });
}
