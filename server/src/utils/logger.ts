/**
 * Centralized Logger Utility
 *
 * Provides a Pino logger instance for services and utilities
 * that need logging outside of Fastify request context.
 */

import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino(
  isProduction
    ? {
        level: process.env.LOG_LEVEL || 'info',
      }
    : {
        level: process.env.LOG_LEVEL || 'info',
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
          },
        },
      }
);

// Service-specific loggers
export const auditLogger = logger.child({ service: 'audit' });
export const mcpLogger = logger.child({ service: 'mcp' });
export const schedulerLogger = logger.child({ service: 'scheduler' });
export const taskLogger = logger.child({ service: 'task-execution' });
export const masterAgentLogger = logger.child({ service: 'master-agent' });
