import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticationRoutes } from './authentication.routes.js';
import { registrationRoutes } from './registration.routes.js';
import { passwordRoutes } from './password.routes.js';
import { emailVerificationRoutes } from './email-verification.routes.js';

/**
 * Auth routes - Modular authentication system
 *
 * This module consolidates all authentication-related routes:
 * - Authentication: login, logout, refresh, me, profile
 * - Registration: register, accept-invitation, invitation preview
 * - Password: change-password, forgot-password, reset-password
 * - Email Verification: verify-email, send-verification, resend-verification
 */
export async function authRoutes(fastify: FastifyInstance) {
  // Register all auth sub-routes
  await fastify.register(authenticationRoutes);
  await fastify.register(registrationRoutes);
  await fastify.register(passwordRoutes);
  await fastify.register(emailVerificationRoutes);
}

// Declare authenticate decorator
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
