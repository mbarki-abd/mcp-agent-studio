import { FastifyInstance } from 'fastify';
import { prisma } from '../index.js';
import { hashPassword, verifyPassword } from '../utils/password.js';

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  organizationName?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    organizationId: string;
  };
  token: string;
  refreshToken: string;
}

export class AuthService {
  constructor(private fastify: FastifyInstance) {}

  async register(input: RegisterInput): Promise<AuthResult> {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Hash password
    const passwordHash = await hashPassword(input.password);

    // Create organization
    const orgName = input.organizationName || `${input.name}'s Organization`;
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
        email: input.email,
        passwordHash,
        name: input.name,
        role: 'ADMIN', // First user is admin
        organizationId: organization.id,
      },
    });

    // Generate tokens
    const { token, refreshToken } = this.generateTokens(user);

    // Create session
    await this.createSession(user.id, token, refreshToken);

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
  }

  async login(input: LoginInput): Promise<AuthResult> {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const validPassword = await verifyPassword(input.password, user.passwordHash);

    if (!validPassword) {
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    const { token, refreshToken } = this.generateTokens(user);

    // Create session
    await this.createSession(user.id, token, refreshToken);

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
  }

  async refresh(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    // Find session
    const session = await prisma.session.findUnique({
      where: { refreshToken },
    });

    if (!session) {
      throw new Error('Invalid refresh token');
    }

    // Verify token
    try {
      const decoded = this.fastify.jwt.verify(refreshToken) as { userId: string; type: string };

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Get user
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Generate new tokens
      const tokens = this.generateTokens(user);

      // Update session
      await prisma.session.update({
        where: { id: session.id },
        data: {
          token: tokens.token,
          refreshToken: tokens.refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      return tokens;
    } catch {
      throw new Error('Invalid refresh token');
    }
  }

  async logout(token: string): Promise<void> {
    await prisma.session.deleteMany({
      where: { token },
    });
  }

  async getUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });

    if (!user) {
      return null;
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
  }

  private generateTokens(user: { id: string; email: string; role: string }) {
    const token = this.fastify.jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      { expiresIn: '7d' }
    );

    const refreshToken = this.fastify.jwt.sign(
      { userId: user.id, type: 'refresh' },
      { expiresIn: '30d' }
    );

    return { token, refreshToken };
  }

  private async createSession(userId: string, token: string, refreshToken: string) {
    await prisma.session.create({
      data: {
        userId,
        token,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  }

  async cleanExpiredSessions(): Promise<number> {
    const result = await prisma.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
    return result.count;
  }
}
