import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../services/auth.service.js';
import { prisma } from '../index.js';
import { hashPassword, verifyPassword } from '../utils/password.js';

// Mock dependencies
vi.mock('../index.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    organization: {
      create: vi.fn(),
    },
    session: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock('../utils/password.js', () => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}));

describe('AuthService', () => {
  let authService: AuthService;
  let mockFastify: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockFastify = {
      jwt: {
        sign: vi.fn((payload: any) => {
          if (payload.type === 'refresh') {
            return 'mock-refresh-token';
          }
          return 'mock-access-token';
        }),
        verify: vi.fn(),
      },
    };

    authService = new AuthService(mockFastify);
  });

  describe('register', () => {
    it('should register new user successfully', async () => {
      // Arrange
      const input = {
        email: 'test@example.com',
        password: 'securePassword123',
        name: 'Test User',
        organizationName: 'Test Org',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(hashPassword).mockResolvedValue('hashed-password');
      vi.mocked(prisma.organization.create).mockResolvedValue({
        id: 'org-123',
        name: 'Test Org',
        slug: 'test-org-123',
        plan: 'FREE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        name: 'Test User',
        role: 'ADMIN',
        organizationId: 'org-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        apiQuotaLimit: 1000,
        apiQuotaUsed: 0,
        quotaResetAt: new Date(),
      });
      vi.mocked(prisma.session.create).mockResolvedValue({} as any);

      // Act
      const result = await authService.register(input);

      // Assert
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: input.email },
      });
      expect(hashPassword).toHaveBeenCalledWith(input.password);
      expect(prisma.organization.create).toHaveBeenCalled();
      expect(prisma.user.create).toHaveBeenCalled();
      expect(result.user.email).toBe(input.email);
      expect(result.token).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
    });

    it('should throw error when email already exists', async () => {
      // Arrange
      const input = {
        email: 'existing@example.com',
        password: 'password',
        name: 'User',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'existing-user',
        email: 'existing@example.com',
      } as any);

      // Act & Assert
      await expect(authService.register(input)).rejects.toThrow('Email already registered');
      expect(hashPassword).not.toHaveBeenCalled();
      expect(prisma.organization.create).not.toHaveBeenCalled();
    });

    it('should create organization with default name when not provided', async () => {
      // Arrange
      const input = {
        email: 'test@example.com',
        password: 'password',
        name: 'John Doe',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(hashPassword).mockResolvedValue('hashed');
      vi.mocked(prisma.organization.create).mockResolvedValue({
        id: 'org-123',
        name: "John Doe's Organization",
        slug: 'john-does-organization-123',
        plan: 'FREE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: 'user-123',
        organizationId: 'org-123',
        role: 'ADMIN',
      } as any);
      vi.mocked(prisma.session.create).mockResolvedValue({} as any);

      // Act
      await authService.register(input);

      // Assert
      expect(prisma.organization.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "John Doe's Organization",
          }),
        })
      );
    });

    it('should create user with ADMIN role', async () => {
      // Arrange
      const input = {
        email: 'admin@example.com',
        password: 'password',
        name: 'Admin',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(hashPassword).mockResolvedValue('hashed');
      vi.mocked(prisma.organization.create).mockResolvedValue({ id: 'org-123' } as any);
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: 'user-123',
        role: 'ADMIN',
        organizationId: 'org-123',
      } as any);
      vi.mocked(prisma.session.create).mockResolvedValue({} as any);

      // Act
      await authService.register(input);

      // Assert
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: 'ADMIN',
          }),
        })
      );
    });
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      // Arrange
      const input = {
        email: 'test@example.com',
        password: 'correctPassword',
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        name: 'Test User',
        role: 'ADMIN',
        organizationId: 'org-123',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(verifyPassword).mockResolvedValue(true);
      vi.mocked(prisma.session.create).mockResolvedValue({} as any);

      // Act
      const result = await authService.login(input);

      // Assert
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: input.email },
      });
      expect(verifyPassword).toHaveBeenCalledWith(input.password, mockUser.passwordHash);
      expect(result.user.id).toBe(mockUser.id);
      expect(result.token).toBe('mock-access-token');
    });

    it('should throw error when user not found', async () => {
      // Arrange
      const input = {
        email: 'nonexistent@example.com',
        password: 'password',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      // Act & Assert
      await expect(authService.login(input)).rejects.toThrow('Invalid credentials');
      expect(verifyPassword).not.toHaveBeenCalled();
    });

    it('should throw error when password is incorrect', async () => {
      // Arrange
      const input = {
        email: 'test@example.com',
        password: 'wrongPassword',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-123',
        passwordHash: 'hashed',
      } as any);
      vi.mocked(verifyPassword).mockResolvedValue(false);

      // Act & Assert
      await expect(authService.login(input)).rejects.toThrow('Invalid credentials');
      expect(prisma.session.create).not.toHaveBeenCalled();
    });

    it('should create session after successful login', async () => {
      // Arrange
      const input = { email: 'test@example.com', password: 'password' };

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-123',
        passwordHash: 'hashed',
        organizationId: 'org-123',
      } as any);
      vi.mocked(verifyPassword).mockResolvedValue(true);
      vi.mocked(prisma.session.create).mockResolvedValue({} as any);

      // Act
      await authService.login(input);

      // Assert
      expect(prisma.session.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-123',
            token: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
          }),
        })
      );
    });
  });

  describe('refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      // Arrange
      const refreshToken = 'valid-refresh-token';
      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        token: 'old-token',
        refreshToken,
      };

      vi.mocked(prisma.session.findUnique).mockResolvedValue(mockSession as any);
      vi.mocked(mockFastify.jwt.verify).mockReturnValue({
        userId: 'user-123',
        type: 'refresh',
      });
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        role: 'USER',
      } as any);
      vi.mocked(prisma.session.update).mockResolvedValue({} as any);

      // Act
      const result = await authService.refresh(refreshToken);

      // Assert
      expect(prisma.session.findUnique).toHaveBeenCalledWith({
        where: { refreshToken },
      });
      expect(mockFastify.jwt.verify).toHaveBeenCalledWith(refreshToken);
      expect(result.token).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
    });

    it('should throw error when session not found', async () => {
      // Arrange
      vi.mocked(prisma.session.findUnique).mockResolvedValue(null);

      // Act & Assert
      await expect(authService.refresh('invalid-token')).rejects.toThrow('Invalid refresh token');
    });

    it('should throw error when token type is not refresh', async () => {
      // Arrange
      vi.mocked(prisma.session.findUnique).mockResolvedValue({ id: 'session-123' } as any);
      vi.mocked(mockFastify.jwt.verify).mockReturnValue({
        userId: 'user-123',
        type: 'access', // Wrong type
      });

      // Act & Assert
      await expect(authService.refresh('token')).rejects.toThrow('Invalid refresh token');
    });

    it('should throw error when user not found', async () => {
      // Arrange
      vi.mocked(prisma.session.findUnique).mockResolvedValue({ id: 'session-123' } as any);
      vi.mocked(mockFastify.jwt.verify).mockReturnValue({
        userId: 'nonexistent-user',
        type: 'refresh',
      });
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      // Act & Assert
      await expect(authService.refresh('token')).rejects.toThrow();
    });

    it('should update session with new tokens', async () => {
      // Arrange
      const mockSession = { id: 'session-123', userId: 'user-123' };
      vi.mocked(prisma.session.findUnique).mockResolvedValue(mockSession as any);
      vi.mocked(mockFastify.jwt.verify).mockReturnValue({
        userId: 'user-123',
        type: 'refresh',
      });
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        role: 'USER',
      } as any);
      vi.mocked(prisma.session.update).mockResolvedValue({} as any);

      // Act
      await authService.refresh('token');

      // Assert
      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: mockSession.id },
        data: expect.objectContaining({
          token: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          expiresAt: expect.any(Date),
        }),
      });
    });
  });

  describe('logout', () => {
    it('should delete session on logout', async () => {
      // Arrange
      const token = 'user-token';
      vi.mocked(prisma.session.deleteMany).mockResolvedValue({ count: 1 });

      // Act
      await authService.logout(token);

      // Assert
      expect(prisma.session.deleteMany).toHaveBeenCalledWith({
        where: { token },
      });
    });

    it('should not throw error when session does not exist', async () => {
      // Arrange
      vi.mocked(prisma.session.deleteMany).mockResolvedValue({ count: 0 });

      // Act & Assert
      await expect(authService.logout('nonexistent-token')).resolves.not.toThrow();
    });
  });

  describe('getUser', () => {
    it('should get user with organization', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'ADMIN',
        organization: {
          id: 'org-123',
          name: 'Test Org',
          plan: 'PRO',
        },
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      // Act
      const result = await authService.getUser('user-123');

      // Assert
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        include: { organization: true },
      });
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
        organization: {
          id: mockUser.organization.id,
          name: mockUser.organization.name,
          plan: mockUser.organization.plan,
        },
      });
    });

    it('should return null when user not found', async () => {
      // Arrange
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      // Act
      const result = await authService.getUser('nonexistent-user');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('cleanExpiredSessions', () => {
    it('should delete expired sessions', async () => {
      // Arrange
      vi.mocked(prisma.session.deleteMany).mockResolvedValue({ count: 5 });

      // Act
      const result = await authService.cleanExpiredSessions();

      // Assert
      expect(prisma.session.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: { lt: expect.any(Date) },
        },
      });
      expect(result).toBe(5);
    });

    it('should return 0 when no expired sessions', async () => {
      // Arrange
      vi.mocked(prisma.session.deleteMany).mockResolvedValue({ count: 0 });

      // Act
      const result = await authService.cleanExpiredSessions();

      // Assert
      expect(result).toBe(0);
    });
  });
});
