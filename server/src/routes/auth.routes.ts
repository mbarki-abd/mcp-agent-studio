import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../index.js';
import { auditLogin, auditLogout } from '../middleware/audit.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import { rateLimitAuth } from '../middleware/ratelimit.middleware.js';
import { authSchemas } from '../schemas/index.js';
import {
  setAuthCookies,
  clearAuthCookies,
  COOKIE_ACCESS_TOKEN,
  COOKIE_REFRESH_TOKEN,
} from '../utils/cookies.js';

// Type definitions for validated request bodies
type RegisterBody = {
  email: string;
  password: string;
  name: string;
  organizationName?: string;
};

type LoginBody = {
  email: string;
  password: string;
};

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

    // TODO: Send email with verification link
    // In production, integrate with email service (SendGrid, SES, etc.)
    // The verification link would be: ${FRONTEND_URL}/verify-email?token=${verificationToken}
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

    // TODO: Send email with verification link
    fastify.log.info(`Email verification resent for ${user.email}. Token: ${verificationToken.substring(0, 8)}...`);

    return { message: 'If an account with that email exists and is not verified, a verification link has been sent' };
  });

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

// Declare authenticate decorator
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
