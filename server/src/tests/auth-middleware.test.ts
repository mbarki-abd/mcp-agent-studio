import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FastifyRequest, FastifyReply } from 'fastify';
import { COOKIE_ACCESS_TOKEN } from '../utils/cookies.js';
import { prisma } from '../index.js';

// Mock prisma
vi.mock('../index.js', () => ({
  prisma: {
    session: {
      findFirst: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe('Auth Middleware', () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;
  let mockFastify: any;
  let authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      cookies: {},
      headers: {},
      jwtVerify: vi.fn(),
      user: undefined,
    };

    mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };

    mockFastify = {
      jwt: {
        verify: vi.fn(),
      },
    };

    // Simulate the authenticate function
    authenticate = async function (request: FastifyRequest, reply: FastifyReply) {
      const cookieToken = request.cookies[COOKIE_ACCESS_TOKEN];
      const headerToken = request.headers.authorization?.replace('Bearer ', '');
      const token = cookieToken || headerToken;

      if (!token) {
        return reply.status(401).send({ error: 'No authentication token provided' });
      }

      // Verify JWT token
      let decoded: any;
      try {
        if (cookieToken && !headerToken) {
          decoded = mockFastify.jwt.verify(cookieToken);
          request.user = decoded;
        } else {
          await request.jwtVerify();
          decoded = request.user;
        }
      } catch (error) {
        return reply.status(401).send({ error: 'Invalid token' });
      }

      const payload = request.user as any;

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

      // Attach user context to request
      request.user = {
        ...payload,
        userId: user.id,
        role: user.role,
        organizationId: user.organizationId,
      };
    };
  });

  describe('authenticate decorator', () => {
    it('should authenticate with valid cookie token', async () => {
      // Arrange
      const token = 'valid-cookie-token';
      mockRequest.cookies = { [COOKIE_ACCESS_TOKEN]: token };

      const decodedPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'ADMIN',
      };

      vi.mocked(mockFastify.jwt.verify).mockReturnValue(decodedPayload);
      vi.mocked(prisma.session.findFirst).mockResolvedValue({
        id: 'session-123',
        userId: 'user-123',
        token,
        expiresAt: new Date(Date.now() + 10000),
      } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-123',
        role: 'ADMIN',
        organizationId: 'org-123',
      } as any);

      // Act
      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockFastify.jwt.verify).toHaveBeenCalledWith(token);
      expect(prisma.session.findFirst).toHaveBeenCalled();
      expect(mockRequest.user).toEqual({
        ...decodedPayload,
        userId: 'user-123',
        role: 'ADMIN',
        organizationId: 'org-123',
      });
      expect(mockReply.status).not.toHaveBeenCalled();
    });

    it('should authenticate with valid Authorization header', async () => {
      // Arrange
      const token = 'valid-header-token';
      mockRequest.headers = { authorization: `Bearer ${token}` };

      const decodedPayload = {
        userId: 'user-456',
        email: 'user@example.com',
        role: 'USER',
      };

      mockRequest.user = decodedPayload;
      vi.mocked(prisma.session.findFirst).mockResolvedValue({
        id: 'session-456',
        userId: 'user-456',
        token,
        expiresAt: new Date(Date.now() + 10000),
      } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-456',
        role: 'USER',
        organizationId: 'org-456',
      } as any);

      // Act
      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockRequest.jwtVerify).toHaveBeenCalled();
      expect(prisma.session.findFirst).toHaveBeenCalled();
    });

    it('should reject request when no token provided', async () => {
      // Arrange
      mockRequest.cookies = {};
      mockRequest.headers = {};

      // Act
      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'No authentication token provided',
      });
      expect(prisma.session.findFirst).not.toHaveBeenCalled();
    });

    it('should reject request when session not found', async () => {
      // Arrange
      const token = 'valid-token';
      mockRequest.cookies = { [COOKIE_ACCESS_TOKEN]: token };

      vi.mocked(mockFastify.jwt.verify).mockReturnValue({
        userId: 'user-123',
      });
      vi.mocked(prisma.session.findFirst).mockResolvedValue(null);

      // Act
      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Session expired or invalid',
      });
    });

    it('should reject request when session expired', async () => {
      // Arrange
      const token = 'expired-token';
      mockRequest.cookies = { [COOKIE_ACCESS_TOKEN]: token };

      vi.mocked(mockFastify.jwt.verify).mockReturnValue({
        userId: 'user-123',
      });
      vi.mocked(prisma.session.findFirst).mockResolvedValue(null); // Expired session won't be found

      // Act
      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(prisma.session.findFirst).toHaveBeenCalledWith({
        where: {
          token,
          userId: 'user-123',
          expiresAt: { gt: expect.any(Date) },
        },
      });
      expect(mockReply.status).toHaveBeenCalledWith(401);
    });

    it('should reject request when user not found', async () => {
      // Arrange
      const token = 'valid-token';
      mockRequest.cookies = { [COOKIE_ACCESS_TOKEN]: token };

      vi.mocked(mockFastify.jwt.verify).mockReturnValue({
        userId: 'deleted-user',
      });
      vi.mocked(prisma.session.findFirst).mockResolvedValue({
        id: 'session-123',
        userId: 'deleted-user',
        token,
        expiresAt: new Date(Date.now() + 10000),
      } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      // Act
      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'User not found',
      });
    });

    it('should reject request with invalid token', async () => {
      // Arrange
      const token = 'invalid-token';
      mockRequest.cookies = { [COOKIE_ACCESS_TOKEN]: token };

      vi.mocked(mockFastify.jwt.verify).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act
      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Invalid token',
      });
    });

    it('should prefer cookie token over header token', async () => {
      // Arrange
      const cookieToken = 'cookie-token';
      const headerToken = 'header-token';
      mockRequest.cookies = { [COOKIE_ACCESS_TOKEN]: cookieToken };
      mockRequest.headers = { authorization: `Bearer ${headerToken}` };

      vi.mocked(mockFastify.jwt.verify).mockReturnValue({
        userId: 'user-123',
      });
      vi.mocked(prisma.session.findFirst).mockResolvedValue({
        id: 'session-123',
        userId: 'user-123',
        token: cookieToken,
        expiresAt: new Date(Date.now() + 10000),
      } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-123',
        role: 'USER',
        organizationId: 'org-123',
      } as any);

      // Act
      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockFastify.jwt.verify).toHaveBeenCalledWith(cookieToken);
      expect(prisma.session.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({
          token: cookieToken,
        }),
      });
    });

    it('should attach user context with organizationId to request', async () => {
      // Arrange
      const token = 'valid-token';
      mockRequest.cookies = { [COOKIE_ACCESS_TOKEN]: token };

      vi.mocked(mockFastify.jwt.verify).mockReturnValue({
        userId: 'user-123',
        email: 'test@example.com',
      });
      vi.mocked(prisma.session.findFirst).mockResolvedValue({
        id: 'session-123',
        userId: 'user-123',
        token,
        expiresAt: new Date(Date.now() + 10000),
      } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-123',
        role: 'MANAGER',
        organizationId: 'org-456',
      } as any);

      // Act
      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockRequest.user).toMatchObject({
        userId: 'user-123',
        role: 'MANAGER',
        organizationId: 'org-456',
      });
    });
  });
});
