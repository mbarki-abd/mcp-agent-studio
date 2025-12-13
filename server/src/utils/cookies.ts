/**
 * Cookie Configuration Utilities
 *
 * Centralized cookie settings for JWT tokens.
 * Uses httpOnly cookies for security (prevents XSS attacks).
 */
import { FastifyReply } from 'fastify';

const isProduction = process.env.NODE_ENV === 'production';

// Cookie names
export const COOKIE_ACCESS_TOKEN = 'access_token';
export const COOKIE_REFRESH_TOKEN = 'refresh_token';

// Cookie options
export const ACCESS_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction, // HTTPS only in production
  sameSite: 'strict' as const, // CSRF protection
  path: '/',
  maxAge: 30 * 60, // 30 minutes in seconds
};

export const REFRESH_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'strict' as const,
  path: '/api/auth/refresh', // Only sent to refresh endpoint
  maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
};

/**
 * Set authentication cookies on response
 */
export function setAuthCookies(
  reply: FastifyReply,
  accessToken: string,
  refreshToken: string
): void {
  reply.setCookie(COOKIE_ACCESS_TOKEN, accessToken, ACCESS_TOKEN_COOKIE_OPTIONS);
  reply.setCookie(COOKIE_REFRESH_TOKEN, refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
}

/**
 * Clear authentication cookies
 */
export function clearAuthCookies(reply: FastifyReply): void {
  reply.clearCookie(COOKIE_ACCESS_TOKEN, { path: '/' });
  reply.clearCookie(COOKIE_REFRESH_TOKEN, { path: '/api/auth/refresh' });
}
