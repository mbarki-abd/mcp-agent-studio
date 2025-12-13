import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FastifyReply } from 'fastify';
import {
  setAuthCookies,
  clearAuthCookies,
  COOKIE_ACCESS_TOKEN,
  COOKIE_REFRESH_TOKEN,
  ACCESS_TOKEN_COOKIE_OPTIONS,
  REFRESH_TOKEN_COOKIE_OPTIONS,
} from '../utils/cookies.js';

describe('Cookie Utils', () => {
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    mockReply = {
      setCookie: vi.fn(),
      clearCookie: vi.fn(),
    };
  });

  describe('Cookie constants', () => {
    it('should have correct cookie names', () => {
      // Assert
      expect(COOKIE_ACCESS_TOKEN).toBe('access_token');
      expect(COOKIE_REFRESH_TOKEN).toBe('refresh_token');
    });

    it('should have correct access token cookie options', () => {
      // Assert
      expect(ACCESS_TOKEN_COOKIE_OPTIONS.httpOnly).toBe(true);
      expect(ACCESS_TOKEN_COOKIE_OPTIONS.sameSite).toBe('strict');
      expect(ACCESS_TOKEN_COOKIE_OPTIONS.path).toBe('/');
      expect(ACCESS_TOKEN_COOKIE_OPTIONS.maxAge).toBe(30 * 60); // 30 minutes
    });

    it('should have correct refresh token cookie options', () => {
      // Assert
      expect(REFRESH_TOKEN_COOKIE_OPTIONS.httpOnly).toBe(true);
      expect(REFRESH_TOKEN_COOKIE_OPTIONS.sameSite).toBe('strict');
      expect(REFRESH_TOKEN_COOKIE_OPTIONS.path).toBe('/api/auth/refresh');
      expect(REFRESH_TOKEN_COOKIE_OPTIONS.maxAge).toBe(7 * 24 * 60 * 60); // 7 days
    });

    it('should set secure flag based on NODE_ENV in production', () => {
      // Note: This test assumes NODE_ENV is not 'production' in test environment
      // In production, secure should be true
      const isProduction = process.env.NODE_ENV === 'production';

      // Assert
      expect(ACCESS_TOKEN_COOKIE_OPTIONS.secure).toBe(isProduction);
      expect(REFRESH_TOKEN_COOKIE_OPTIONS.secure).toBe(isProduction);
    });
  });

  describe('setAuthCookies', () => {
    it('should set both access and refresh token cookies', () => {
      // Arrange
      const accessToken = 'access-token-123';
      const refreshToken = 'refresh-token-456';

      // Act
      setAuthCookies(mockReply as FastifyReply, accessToken, refreshToken);

      // Assert
      expect(mockReply.setCookie).toHaveBeenCalledTimes(2);
      expect(mockReply.setCookie).toHaveBeenCalledWith(
        COOKIE_ACCESS_TOKEN,
        accessToken,
        ACCESS_TOKEN_COOKIE_OPTIONS
      );
      expect(mockReply.setCookie).toHaveBeenCalledWith(
        COOKIE_REFRESH_TOKEN,
        refreshToken,
        REFRESH_TOKEN_COOKIE_OPTIONS
      );
    });

    it('should handle empty tokens', () => {
      // Arrange
      const accessToken = '';
      const refreshToken = '';

      // Act
      setAuthCookies(mockReply as FastifyReply, accessToken, refreshToken);

      // Assert
      expect(mockReply.setCookie).toHaveBeenCalledTimes(2);
      expect(mockReply.setCookie).toHaveBeenCalledWith(COOKIE_ACCESS_TOKEN, '', expect.any(Object));
      expect(mockReply.setCookie).toHaveBeenCalledWith(COOKIE_REFRESH_TOKEN, '', expect.any(Object));
    });

    it('should use correct cookie options for access token', () => {
      // Act
      setAuthCookies(mockReply as FastifyReply, 'access', 'refresh');

      // Assert
      const accessTokenCall = vi.mocked(mockReply.setCookie!).mock.calls.find(
        call => call[0] === COOKIE_ACCESS_TOKEN
      );
      expect(accessTokenCall?.[2]).toEqual(ACCESS_TOKEN_COOKIE_OPTIONS);
    });

    it('should use correct cookie options for refresh token', () => {
      // Act
      setAuthCookies(mockReply as FastifyReply, 'access', 'refresh');

      // Assert
      const refreshTokenCall = vi.mocked(mockReply.setCookie!).mock.calls.find(
        call => call[0] === COOKIE_REFRESH_TOKEN
      );
      expect(refreshTokenCall?.[2]).toEqual(REFRESH_TOKEN_COOKIE_OPTIONS);
    });

    it('should set cookies with httpOnly flag', () => {
      // Act
      setAuthCookies(mockReply as FastifyReply, 'access', 'refresh');

      // Assert
      const calls = vi.mocked(mockReply.setCookie!).mock.calls;
      calls.forEach(call => {
        const options = call[2];
        expect(options?.httpOnly).toBe(true);
      });
    });

    it('should set cookies with strict sameSite policy', () => {
      // Act
      setAuthCookies(mockReply as FastifyReply, 'access', 'refresh');

      // Assert
      const calls = vi.mocked(mockReply.setCookie!).mock.calls;
      calls.forEach(call => {
        const options = call[2];
        expect(options?.sameSite).toBe('strict');
      });
    });
  });

  describe('clearAuthCookies', () => {
    it('should clear both access and refresh token cookies', () => {
      // Act
      clearAuthCookies(mockReply as FastifyReply);

      // Assert
      expect(mockReply.clearCookie).toHaveBeenCalledTimes(2);
      expect(mockReply.clearCookie).toHaveBeenCalledWith(COOKIE_ACCESS_TOKEN, { path: '/' });
      expect(mockReply.clearCookie).toHaveBeenCalledWith(COOKIE_REFRESH_TOKEN, {
        path: '/api/auth/refresh',
      });
    });

    it('should clear access token with root path', () => {
      // Act
      clearAuthCookies(mockReply as FastifyReply);

      // Assert
      const accessTokenCall = vi.mocked(mockReply.clearCookie!).mock.calls.find(
        call => call[0] === COOKIE_ACCESS_TOKEN
      );
      expect(accessTokenCall?.[1]).toEqual({ path: '/' });
    });

    it('should clear refresh token with auth refresh path', () => {
      // Act
      clearAuthCookies(mockReply as FastifyReply);

      // Assert
      const refreshTokenCall = vi.mocked(mockReply.clearCookie!).mock.calls.find(
        call => call[0] === COOKIE_REFRESH_TOKEN
      );
      expect(refreshTokenCall?.[1]).toEqual({ path: '/api/auth/refresh' });
    });

    it('should not throw when called multiple times', () => {
      // Act & Assert
      expect(() => {
        clearAuthCookies(mockReply as FastifyReply);
        clearAuthCookies(mockReply as FastifyReply);
      }).not.toThrow();
    });
  });

  describe('Cookie security', () => {
    it('should have different paths for access and refresh tokens', () => {
      // Assert
      expect(ACCESS_TOKEN_COOKIE_OPTIONS.path).toBe('/');
      expect(REFRESH_TOKEN_COOKIE_OPTIONS.path).toBe('/api/auth/refresh');
      expect(ACCESS_TOKEN_COOKIE_OPTIONS.path).not.toBe(REFRESH_TOKEN_COOKIE_OPTIONS.path);
    });

    it('should have different maxAge for access and refresh tokens', () => {
      // Assert
      expect(ACCESS_TOKEN_COOKIE_OPTIONS.maxAge).toBe(30 * 60); // 30 min
      expect(REFRESH_TOKEN_COOKIE_OPTIONS.maxAge).toBe(7 * 24 * 60 * 60); // 7 days
      expect(REFRESH_TOKEN_COOKIE_OPTIONS.maxAge).toBeGreaterThan(
        ACCESS_TOKEN_COOKIE_OPTIONS.maxAge
      );
    });

    it('should have httpOnly enabled for XSS protection', () => {
      // Assert
      expect(ACCESS_TOKEN_COOKIE_OPTIONS.httpOnly).toBe(true);
      expect(REFRESH_TOKEN_COOKIE_OPTIONS.httpOnly).toBe(true);
    });

    it('should have sameSite strict for CSRF protection', () => {
      // Assert
      expect(ACCESS_TOKEN_COOKIE_OPTIONS.sameSite).toBe('strict');
      expect(REFRESH_TOKEN_COOKIE_OPTIONS.sameSite).toBe('strict');
    });
  });
});
